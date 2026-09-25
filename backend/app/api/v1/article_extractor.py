import re
import html
from typing import Optional
from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup, NavigableString

CRAWLER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.google.com/"
}


def clean_html_text(text: str) -> str:
    if not text:
        return ""
    unescaped = html.unescape(text)
    cleaned = re.sub(r"<[^>]+>", " ", unescaped)
    return " ".join(cleaned.split()).strip()


def clean_inline_html(node, base_url: str) -> str:
    """Recursively convert inline tags (strong, em, code, a) to clean Markdown."""
    if isinstance(node, str):
        return node

    text = ""
    for child in getattr(node, "children", []):
        if isinstance(child, str):
            text += child
        elif child.name in ["strong", "b"]:
            inner = clean_inline_html(child, base_url).strip()
            text += f" **{inner}** " if inner else ""
        elif child.name in ["em", "i"]:
            inner = clean_inline_html(child, base_url).strip()
            text += f" *{inner}* " if inner else ""
        elif child.name == "code":
            inner = child.get_text().strip()
            text += f" `{inner}` " if inner else ""
        elif child.name == "a":
            href = child.get("href", "").strip()
            inner = clean_inline_html(child, base_url).strip()
            if href and inner and not href.startswith("javascript:") and not href.startswith("#"):
                abs_href = urljoin(base_url, href)
                text += f" [{inner}]({abs_href}) "
            else:
                text += inner
        elif child.name == "br":
            text += "\n"
        else:
            text += clean_inline_html(child, base_url)
    return text


def extract_cover_image(item_node, raw_text: str = "") -> Optional[str]:
    enc = item_node.find("enclosure")
    if enc is not None and enc.attrib.get("url"):
        enc_type = enc.attrib.get("type", "").lower()
        if not enc_type or "image" in enc_type or enc.attrib["url"].lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            return enc.attrib["url"]

    for tag_name in [
        "{http://search.yahoo.com/mrss/}content",
        "{http://search.yahoo.com/mrss/}thumbnail",
        "media:content",
        "media:thumbnail"
    ]:
        media_node = item_node.find(tag_name)
        if media_node is not None and media_node.attrib.get("url"):
            return media_node.attrib["url"]

    if raw_text:
        match = re.search(r'<img[^>]+(?:src|data-src|data-original)=[\'"]([^\'"]+)[\'"]', raw_text, re.IGNORECASE)
        if match:
            return match.group(1)

    return None


def convert_soup_to_markdown(container, base_url: str = "", lead_text: str = "") -> str:
    """Convert HTML container element to clean structured Markdown with headings, code blocks, images, quotes."""
    if not container:
        return ""

    # Remove irrelevant script, style, ad elements
    for bad in container.find_all(["script", "style", "noscript", "nav", "footer", "form", "button", "svg", "aside"]):
        bad.decompose()

    for ad in container.find_all(class_=lambda c: c and any(k in str(c).lower() for k in [
        "banner", "ads", "advert", "box-tinlienquan", "share-box", "social", "sidebar", "newsletter", "relate-news", "box-embed"
    ])):
        ad.decompose()

    parts = []
    if lead_text:
        parts.append(f"{lead_text}\n\n")

    processed_images = set()

    # Search for all semantic article components
    target_tags = ["p", "h1", "h2", "h3", "h4", "h5", "figure", "pre", "blockquote", "ul", "ol", "table", "span", "div"]
    elements = container.find_all(target_tags)

    for elem in elements:
        # Avoid duplicate inner processing if already inside another processed block
        parent_tag = elem.find_parent(["p", "figure", "pre", "blockquote", "ul", "ol", "table"])
        if parent_tag and parent_tag != container:
            continue

        if elem.name in ["h1", "h2", "h3", "h4", "h5"]:
            level_num = 2 if elem.name in ["h1", "h2"] else (3 if elem.name == "h3" else 4)
            level = "#" * level_num
            txt = elem.get_text().strip()
            if txt and len(txt) > 2:
                parts.append(f"\n\n{level} {txt}\n\n")

        elif elem.name == "figure" or (elem.name == "div" and any(k in " ".join(elem.get("class", [])) for k in ["photo", "image", "picture", "fig-caption"])):
            img = elem.find("img")
            if img:
                src = img.get("src") or img.get("data-src") or img.get("data-original") or img.get("data-lazy-src") or img.get("data-actualsrc")
                if src and not src.startswith("data:") and src not in processed_images:
                    abs_src = urljoin(base_url, src)
                    processed_images.add(src)
                    caption = elem.find(["figcaption", "p", "div"], class_=lambda c: c and any(k in str(c).lower() for k in ["caption", "desc", "note"]))
                    cap_text = caption.get_text().strip() if caption else (img.get("alt", "").strip())
                    parts.append(f"\n\n![{cap_text}]({abs_src})\n" + (f"*{cap_text}*\n\n" if cap_text else "\n"))

        elif elem.name == "pre":
            code = elem.find("code")
            code_text = code.get_text() if code else elem.get_text()
            cls = (code.get("class", []) if code else []) + (elem.get("class", []) or [])
            lang = ""
            for c in cls:
                c_str = str(c)
                if "lang-" in c_str or "language-" in c_str:
                    lang = c_str.replace("lang-", "").replace("language-", "")
                    break
            parts.append(f"\n\n```{lang}\n{code_text.strip()}\n```\n\n")

        elif elem.name == "blockquote":
            q_text = elem.get_text().strip()
            if q_text:
                quoted = "\n".join("> " + line.strip() for line in q_text.splitlines() if line.strip())
                parts.append(f"\n\n{quoted}\n\n")

        elif elem.name in ["ul", "ol"]:
            list_items = []
            for idx, li in enumerate(elem.find_all("li", recursive=False)):
                li_text = clean_inline_html(li, base_url).strip()
                li_text = " ".join(li_text.split())
                if li_text:
                    prefix = f"{idx+1}. " if elem.name == "ol" else "- "
                    list_items.append(f"{prefix}{li_text}")
            if list_items:
                parts.append("\n\n" + "\n".join(list_items) + "\n\n")

        elif elem.name == "table":
            rows = elem.find_all("tr")
            if rows:
                t_lines = []
                for r_idx, r in enumerate(rows):
                    cols = [c.get_text().strip() for c in r.find_all(["th", "td"])]
                    if cols:
                        t_lines.append("| " + " | ".join(cols) + " |")
                        if r_idx == 0:
                            t_lines.append("| " + " | ".join(["---"] * len(cols)) + " |")
                if t_lines:
                    parts.append("\n\n" + "\n".join(t_lines) + "\n\n")

        elif elem.name in ["p", "span", "div"]:
            # Check for standalone or lazy images inside this element
            for img in elem.find_all("img"):
                src = img.get("src") or img.get("data-src") or img.get("data-original") or img.get("data-lazy-src")
                if src and not src.startswith("data:") and src not in processed_images:
                    abs_src = urljoin(base_url, src)
                    processed_images.add(src)
                    alt = img.get("alt", "").strip()
                    parts.append(f"\n\n![{alt}]({abs_src})\n\n")

            # Check if this element represents a paragraph (or XenForo/TinhTe xf-body-paragraph)
            is_para = elem.name == "p" or any(k in " ".join(elem.get("class", [])) for k in [
                "paragraph", "xf-body", "xf-body-paragraph", "content-para", "text-body"
            ])
            if is_para:
                txt = clean_inline_html(elem, base_url).strip()
                txt = " ".join(txt.split())
                if txt and len(txt) > 5:
                    # Filter junk footer lines
                    if not any(skip in txt.lower() for skip in [
                        "chia sẻ bài viết", "đăng ký nhận tin", "độc giả gửi bài", "xem thêm:"
                    ]):
                        if not (lead_text and txt == lead_text):
                            parts.append(f"\n\n{txt}\n\n")

    # If parts has very few items or very short text, fallback to extracting direct lines
    raw_md = "".join(parts).strip()
    if len(raw_md) < 150:
        text_lines = []
        for line in container.get_text(separator="\n").splitlines():
            line_str = " ".join(line.split()).strip()
            if len(line_str) > 20 and not any(skip in line_str.lower() for skip in [
                "bình luận", "chia sẻ", "theo dõi", "quảng cáo", "copyright", "bản quyền"
            ]):
                text_lines.append(line_str)
        if text_lines:
            raw_md = (f"{lead_text}\n\n" if lead_text else "") + "\n\n".join(text_lines)

    return re.sub(r"\n{3,}", "\n\n", raw_md).strip()


def convert_html_to_markdown(raw_html: str, base_url: str = "") -> str:
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    target = soup.body if soup.body else soup
    return convert_soup_to_markdown(target, base_url=base_url)


def extract_full_article_from_url(url: str, fallback_title: str = "", timeout: float = 8.0) -> dict:
    """
    Crawls an article web page (VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, VietnamNet, GenK, Tinh tế,
    Viblo, Dev.to, GitHub Blog, FreeCodeCamp, AWS, HN links, TechCrunch, Verge, etc.)
    and converts headings, paragraphs, images, code blocks, and blockquotes into clean Markdown.
    """
    result = {
        "content": "",
        "excerpt": "",
        "cover_image": None,
        "word_count": 0,
        "success": False
    }
    if not url or not url.startswith("http"):
        return result

    try:
        resp = httpx.get(url, headers=CRAWLER_HEADERS, timeout=timeout, follow_redirects=True)
        if resp.status_code != 200 or not resp.text:
            return result

        soup = BeautifulSoup(resp.text, "html.parser")

        # 1. Metadata: og:image, og:description
        og_img = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
        if og_img and og_img.get("content"):
            c_img = og_img.get("content").strip()
            if c_img and not c_img.startswith("data:"):
                result["cover_image"] = urljoin(url, c_img)

        og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
        lead_meta = og_desc.get("content").strip() if (og_desc and og_desc.get("content")) else ""

        lead_elem = (
            soup.find("p", class_=lambda c: c and any(k in str(c).lower() for k in ["description", "lead", "sapo", "summary"]))
            or soup.find(class_="description")
            or soup.find(class_="lead")
            or soup.find(class_="sapo")
        )
        lead_text = lead_elem.get_text().strip() if lead_elem else lead_meta
        lead_text = " ".join(lead_text.split())

        # 2. Select target content container across diverse websites
        selectors = [
            # Vietnamese Portals & Tech Sites
            "article.fck_detail", "div.fck_detail", "div.sidebar_1 .fck_detail", ".fck_detail",
            "div.detail-content", "div.content-detail", "div.detail-cmain", "div.detail__content",
            "div.singular-content", "div.dt-news__content", "div#maincontent", "div.maincontent",
            "div.knc-content", "div.jsx-article-content", "div.article-content__body",
            # Forums & Communities (Tinh tế, XenForo, Viblo)
            "div.thread-content", "div.thread-body-wrapper", "div.xfBody", "div.full-content", "div.bbWrapper",
            "div.md-contents", "div.article-content",
            # Developer Blogs (Dev.to, GitHub, FreeCodeCamp, Medium, Ghost)
            "div#article-body", "div.crayons-article__body",
            "article.markdown-body", "div.markdown-body", "div#readme",
            "section.post-content", "section.post-full-content", "article.post-full", "div.gh-content",
            "div.blog-post-content", "div.entry-content",
            # International Tech Media (The Verge, TechCrunch, BleepingComputer, Substack)
            "div.c-entry-content", "div.article_body", "div.article__body", "div.story-body",
            "div[itemprop='articleBody']", "article[itemprop='articleBody']",
            "div.available-content", "div.post-body", "div.rich-text", "div.prose",
            "article", "main"
        ]

        container = None
        for sel in selectors:
            candidate = soup.select_one(sel)
            if candidate and len(candidate.get_text().strip()) > 180:
                container = candidate
                break

        # Heuristic container scoring fallback
        if not container:
            best_score = 0
            for tag in soup.find_all(["article", "main", "section", "div"]):
                tid = tag.get("id", "") or ""
                tcls = " ".join(tag.get("class", []) or [])
                if any(bad in (tid + tcls).lower() for bad in ["nav", "menu", "header", "footer", "sidebar", "comments", "related"]):
                    continue
                body_txt = tag.get_text().strip()
                if len(body_txt) > 250:
                    p_tags = tag.find_all(["p", "span", "pre"])
                    score = len(p_tags) * 80 + len(body_txt)
                    if score > best_score:
                        best_score = score
                        container = tag

        if not container:
            return result

        # 3. Convert container elements to clean Markdown
        clean_md = convert_soup_to_markdown(container, base_url=url, lead_text=lead_text)

        if len(clean_md) > 120:
            title_text = fallback_title or "Bài viết gốc"
            final_content = f"{clean_md}\n\n---\n*Nguồn tin gốc: [{title_text}]({url})*"
            result["content"] = final_content
            result["excerpt"] = lead_text if lead_text else (clean_md[:240] + "...")
            result["word_count"] = len(final_content.split())
            result["success"] = True

    except Exception as e:
        result["error"] = str(e)

    return result
