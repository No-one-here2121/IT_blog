export default function Input_bar({input_value,input_type}) {
    return (
    <fieldset className="fieldset">
     <label className={input_value}>Email</label>
     <input type={input_type} className="input" placeholder={input_value} />
    </fieldset>
    )
}