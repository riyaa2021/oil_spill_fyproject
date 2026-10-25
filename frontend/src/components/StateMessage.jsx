export default function StateMessage({error,onDismiss}) {
 if(!error) return null;
 return <div className="error-box" role="alert">{error}<button onClick={onDismiss}>Dismiss</button></div>;
}
