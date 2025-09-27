
export default function Login(){

    async function onSubmit(event: React.FormEvent<HTMLFormElement>){
        
    }

    return(
        <form onSubmit={onSubmit}>
            <label htmlFor="id">Username:</label><br/>
            <input type="text" id="id" name="id"/><br/>
            <label htmlFor="password">Password:</label><br/>
            <input type="password" id="password" name="password"/>
            <input type="submit" value="Submit"/>
        </form>
    )
}