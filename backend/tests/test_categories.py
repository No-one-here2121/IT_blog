def test_get_categories_and_tags(client):
    # Categories
    cat_res = client.get("/api/v1/categories")
    assert cat_res.status_code == 200
    assert isinstance(cat_res.json(), list)

    # Tags
    tags_res = client.get("/api/v1/tags")
    assert tags_res.status_code == 200
    assert isinstance(tags_res.json(), list)
