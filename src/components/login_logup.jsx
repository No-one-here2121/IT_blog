export default function Log_table({log_what,onNavigate}) {
  const isSignUp = log_what === 'Log up';
    return (
        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <legend className="fieldset-legend">{log_what}</legend>

        {isSignUp && (
                <>
                    <label className="label">Username</label>
                    <input type="text" className="input" placeholder="Username" />
                </>
        )}
      
        <label className="label">Email</label>
        <input type="email" className="input" placeholder="Email" />
      
        <label className="label">Password</label>
        <input type="password" className="input" placeholder="Password" />

        {isSignUp && (
                <>
                    <label className="label">Confirm Password</label>
                    <input type="password" className="input" placeholder="Confirm Password" />
                </>
        )}
      
        <button className="btn btn-soft btn-primary mt-4" onClick={() => onNavigate && onNavigate('main_menu')}>{log_what}</button>
      </fieldset>
    )
}