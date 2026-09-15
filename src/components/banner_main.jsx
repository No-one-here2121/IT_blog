import bannerPic from "../assets/A17D7EBB-77F8-4B0C-9E70-EE3358319308.jpg";

export default function Banner_full() {
    return (
        <div className="carousel w-full h-[180px] bg-neutral flex items-center justify-center">
            <div id="slide1" className="carousel-item relative w-full h-full flex items-center justify-center p-2">
                <img
                    alt="Banner"
                    src={bannerPic}
                    className="max-h-full max-w-full object-contain mx-auto rounded-md" 
                />
            </div>
        </div>
    );
}