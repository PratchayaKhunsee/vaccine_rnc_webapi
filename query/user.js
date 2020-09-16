/**
 * @param {import('pg').Client} client
 * @param {String} username 
 */
async function viewUser(client, username) {
    try {
        let user = await client.query(
            'select person_id from user_account where username = $1',
            [
                String(username)
            ]
        );
        if (user.rows.length != 1) {
            throw null;
        }

        let person = await client.query(
            'select first_name,last_name,gender,name_prefix,id_number from person where id = $1',
            [
                Number(user.rows[0].id)
            ]
        );

        if(person.rows.length != 1) {
            throw null;
        }

        return {
            ...person.rows[0]
        };

    } catch (error) {
        throw error;
    }
}

module.exports = {
    viewUser,
}