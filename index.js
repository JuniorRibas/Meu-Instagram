const express = require('express')
const app = express()
const fs = require('fs')
const bodyParser = require('body-parser')
const Client = require('instagram-private-api').V1;
const device = new Client.Device('user');
const Exceptions = require('./node_modules/instagram-private-api/client/v1/exceptions');
const _ = require('lodash');
const Promise = require('bluebird');


//const user = require('./password/user.json')
var valor
var termo
const user = {}
user.nome = null
user.pass = null
user.erro = null
user.storage = new Client.CookieFileStorage(__dirname + '/cookie/someuser.json');


// API SITE https://github.com/dilame/instagram-private-api


async function start(term) {
    valor = null
    termo = term

    Client.Session.create(device, user.storage, user.nome, user.pass)
        .then(function (session) {
            console.log("Sessao :" + session)
            // Now you have a session, we can follow / unfollow, anything...
            // And we want to follow Instagram official profile
            return [session, Client.Account.searchForUser(session, term)]
        })
        .spread(function (session, account) {
            return Client.Relationship.get(session, account.id);
        })
        .then(function (relationship) {
            valor = relationship.params
            user.relacionamento = valor
            console.log("RELACIONAMENTO = ", valor)
            // {followedBy: ... , following: ... }
            // Yey, you just followed @instagram
        })

}


app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.set('view engine', 'ejs')
app.use(express.static('./public'))

function aut(res) {
    if (user.nome === null || user.pass === null) {
        apagarCache()
        res.redirect('/')
    }
}

app.get('/', function (req, res) {
    apagarCache()
    user.storage = new Client.CookieFileStorage(__dirname + '/cookie/someuser.json');
    res.render('login', {mensagem: false})
})

app.get("/pesquisa", function (req, res) {
    aut(res)
    res.render('index')
})
app.post('/term', function (req, res) {
    aut(res)
    user.relacionamento = null
    console.log(start(req.body.termo))
    res.send(req.body.termo)
    //res.redirect('/result')
})

app.post('/result', function (req, res) {
    aut(res)
    setTimeout(function () {
        res.send({relacao: user.relacionamento})
    }, 4000);
    //res.render('relations', {rel :  valor, termo: termo})

})

app.get("/perfil", function (req, res) {
    aut(res)
    user.storage.getAccountId()
        .then(function (accountId) {
            user.id = accountId
            console.log("Id da conta = " + accountId);
        })
    var imagens = []
    var fotoPerfil
    Client.Session.create(device, user.storage, user.nome, user.pass)
        .then(function (session) {
            var feed = new Client.Feed.UserMedia(session, user.id);
            Promise.mapSeries(_.range(0, 1), function () {
                return feed.get();
            })
                .then(function (results) {
                    var media = _.flatten(results);
                    var texto
                    var urls = _.map(media, function (medium) {
                        fotoPerfil = medium._params.user.profile_pic_url
                        texto = medium._params.caption
                        var utl = _.last(medium._params.images)

                        imagens.push({"texto": texto, "url": utl.url})
                    });

                    setTimeout(function () {
                        res.render('perfil', {imagens, fotoPerfil})
                        console.log("ARRAY = " + imagens)
                    }, 2000)
                })
        })
})
app.get('/postar', function (req, res) {
    aut(res)
    postarFoto()

})

app.post('/auth', function (req, res) {
    if (user.nome !== null || user.pass !== null) {
        res.redirect('perfil')
    }
    apagarCache()
    user.storage = new Client.CookieFileStorage(__dirname + '/cookie/someuser.json');
    user.nome = req.body.nome
    user.pass = req.body.pass
    user.erro = null
    var sessao = Client.Session.create(device, user.storage, user.nome, user.pass)
        .catch(Exceptions.AuthenticationError, function (exceptions) {
            console.log("Exceptions", exceptions)
            user.erro = exceptions
            return exceptions
        })
    setTimeout(function () {
        console.log("Error user = ", user.erro)
        if (user.erro) {
            console.log("houve erro na autenticação")
            user.sessao = null
            user.id = null
            apagarCache()
            user.storage = new Client.CookieFileStorage(__dirname + '/cookie/someuser.json');
            user.nome = null
            user.pass = null
            res.redirect("/erro")
        } else {

            user.sessao = sessao
            res.redirect("/perfil")
            //console.log('Sucesso! ', sessao._rejectionHandler0._device);
        }
    }, 5000);
})

app.get("/erro", function (req, res) {
    res.render("login", {mensagem: true})
})

app.get("/sair", function (req, res) {
    apagarCache()

    user.nome = null
    user.pass = null
    res.redirect('/')
})


function apagarCache() {
    fs.unlink(__dirname + '/cookie/someuser.json', function (err) {
        if (err && err.code == 'ENOENT') {
            // file doens't exist
            console.info("File doesn't exist, won't remove it.");
        } else if (err) {
            // other errors, e.g. maybe we don't have enough permission
            console.error("Error occurred while trying to remove file");
        } else {
            console.info(`Cache Apagado`);
        }
    });
}

function postarFoto(foto, legenda) {
    Client.Session.create(device, user.storage, user.nome, user.pass)
        .then(function (seesao) {
            Client.Upload.photo(seesao, foto)
                .then(function (upload) {
                    // upload instanceof Client.Upload
                    // nothing more than just keeping upload id
                    console.log(upload.params.uploadId);
                    return Client.Media.configurePhoto(seesao, upload.params.uploadId, legenda);
                })
                .then(function (medium) {
                    // we configure medium, it is now visible with caption
                    console.log(medium.params)
                })
        })
}


app.listen(8080, function () {
    console.log("rodando....")
})