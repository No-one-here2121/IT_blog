import Navbar from "../components/navigator"
import Banner_full from "../components/banner_main"
import Foot from "../components/footer"

export default function Menu_main({ onNavigate }) {
    return (
        <div className="min-h-screen flex flex-col justify-between">
            <div className="flex-1 flex flex-col">
                <Navbar onNavigate={onNavigate} />
                <Banner_full />
                <div className="content_forum flex-1">
                    
                </div>
            </div>
            <Foot />
        </div>
    )
}