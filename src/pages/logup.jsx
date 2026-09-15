import Log_table from "../components/login_logup"
import Input_as from "../components/log_with"

export default function Logup_page({ onNavigate }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            width: '100%',
            padding: '1rem',
            gap: '1.5rem'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem'
            }}>
                <Log_table log_what='Log up' onNavigate={onNavigate}/>
                <button 
                    onClick={() => onNavigate && onNavigate('login')}
                    className="btn btn-link btn-xs text-xs no-underline hover:underline"
                >
                    Already have an account? Log in
                </button>
            </div>

            <span style={{ color: 'gray', fontWeight: '500' }}>
                OR
            </span>
            <Input_as/>
        </div>
    )
}