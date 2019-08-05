const Client = require('instagram-private-api').V1;
const device = new Client.Device('JovemRapaz_');
const storage = new Client.CookieFileStorage(__dirname + '/cookie/someuser.json');
const user = require('./password/user.json')
var result


 function start (term){
console.log('Termo = ', term)
const sessao =  Client.Session.create(device, storage, user.user, user.pass)
const accout =  Client.Account.searchForUser(sessao, term)
const relationship =  Client.Relationship.get(sessao, accout.id)

console.log(relationship.params)
result = relationship.params
return result
 

}

module.exports = {
	start : function(termo){
        console.log("Importouuuu")
        var retorno = start(termo);
        setTimeout(function() {
            return retorno
        }, 3000);
        
    },
	result : result
}