const config  = require("./config.json")
const Discord = require('discord.js')
const {Client,Intents} = require("discord.js") 
const https = require('https');
const { resolve } = require("path");

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
    ]
})

var prefix = config.prefix
var servers = config.servers

console.log(`prefix   ${prefix}\n`)
console.log(`Found ${servers.length/3} servers\nIf this number has comma, there is something wrong in config.json file`)

var cooldown = []
var status   = []
var hardware = false

for(let i = 0;i < servers.length/3;i+=1)
{
    console.log(`i - ${i}`)
    cooldown[i] = 0
    status[i]   = false
}
console.log(`col - [${cooldown}] ; stat - [${status}]`)

// ---------  -----------  ------------ ON.READY
client.on ("ready" , () => {

    client.channels.cache.get(config.server_bot_channel).send("started") //on start message

    check_status()
    check_hard()
})
// --------  ----------  ---------------

async function check_status() // sprawdzanie czy serwery gry są online
{
    var chan = 0
    for(let i = 0; i<servers.length ; i+=3)
    {
        console.log(i)
        if(await client.channels.cache.get(`${config.servers[i]}`).topic.includes('offline'))
        {
            status[chan] = false
            console.log(`serwer status ${chan} = ${status[chan]}`);chan+=1
        }
        else
        {
            status[chan] = true;console.log(`serwer status ${chan} = ${status[chan]}`)
            chan+=1
            hardware = true
        }
    }
    return "set"
}

function start_hardware() //this starts a machine
{
    const start = {
        hostname: 'maker.ifttt.com',
        port: 443,
        path: config.start,
        method: 'GET',
    }
    var ile = 10  ; var ile_ = 0 ; start_()

    function start_()
    {
        ile_ = ile_+1

        const req = https.request(start, res => {
            console.log(`statusCode: ${res.statusCode}`);
          
            res.on('data', d => {
              process.stdout.write(d);
            })
        })
          
        req.on('error', error => {console.error(error);});
        req.end();

        if(ile_ == ile){}else setTimeout(function(){start_()},8*1000)
    }   
}

const check_hard = () => {
    return new Promise((resolve) => {
        const filter = m => m.content.includes('online')&&m.author.id==config.hardware_bot;
        const collector =  client.channels.cache.get(config.server_bot_channel).createMessageCollector({ filter, time: 15000 });

        client.channels.cache.get(config.server_bot_channel).send("online.status")

        collector.on('collect', m => {
            hardware=true
            resolve(true)
        })

        collector.on('end', collected => {
            if(collected.size<1)
            {
                hardware=false
                resolve(false)
            }
        })
    })
}

client.on("messageCreate",message => {

    if(message.content.startsWith(',,'))
    {
        if(message.content.includes('start'))
        {
            var chan = 0
            for(let i = 0; i<servers.length ; i+=3)
            {
                if(message.channel.id == config.servers[i])
                {
                    if(cooldown[chan]-message.createdTimestamp>0){ //sprawdzanie cooldownu, kazdorazowe wpisanie komendy daje cooldown na 5 minut, aby nie robić błędów
                        console.log(`cooldown _server ${chan}`)
                        message.author.send('cooldown, poczekaj 5 minut') //informacja dla wpisujacego ze jest cooldown na kanał
                        return
                    }

                    cooldown[chan] = message.createdTimestamp+180000  //tu nadaje cooldown domyslnie na 5 minut

                    async function check_if_error() //ta funkcja gdy ktos chce właczyc serwer, sprawdza wszystko czy działa i uruchamia pokolei
                    {
                        await check_status()
                        var any_status = true
                        for(let i = 0; i<servers.length/3; i+=1)
                        {
                            if(status[i] == false)
                            {
                                any_status = false
                            } //Jezeli którykolwiek serwer jest wyłaczony to any_status bedzie false
                        }
                        if(any_status == true) //Fizyczny serwer działa napewno, wiec sproboje właczyc komendą
                        {
                            client.channels.cache.get(config.server_bot_channel).send(config.servers[i+1])
                            setTimeout(function(){
                                client.channels.cache.get(config.server_bot_channel).send(config.servers[i+2])
                            },3*1000)

                            message.channel.send('Powinien być włączony')
                        }
                        else if(any_status == false) //Którys z serwerów nie działa
                        {
                            const hard_s = await check_hard() //najpierw sprawdza czy fizyczny serwer odpowiada
                            if(hard_s == true) //jezeli tak, to uruchamia komendą
                            {
                                client.channels.cache.get(config.server_bot_channel).send(config.servers[i+1])
                                setTimeout(function(){
                                    client.channels.cache.get(config.server_bot_channel).send(config.servers[i+2])
                                },3*1000)
                                message.channel.send('Serwer się uruchamia (30 sekund)')
                            }
                            else if(hard_s == false) //jezeli nie to uruchamia fizyczny serwer
                            {
                                start_hardware()
                                message.channel.send('Serwer się uruchamia (3-4 minuty)')
                            }
                        }
                    }
                    check_if_error()
                }
                chan += 1
            }
        }
        else if(message.content.includes('s'))
        { //do testowania
            console.log(status)
        }
    }
    else if(message.content.includes('Server has stopped'))
    {   //AKTUALIZACJA GDY WEJDZIE INFORMACJA ZE KTORYS SERWER SIE WYLACZYL

        async function stopping()
        {
            await check_status()
            var any_status = false
            for(let i = 0; i<servers.length/3; i+=1)
            {
                if(status[i] == true)
                {
                    any_status = true
                } //Jezeli którykolwiek serwer jest włączony to any_status bedzie true
            }

            if(any_status == false)
            {
                for(let i = 0; i<servers.length/3; i+=1)        //aby nic dziwnego sie nie wydarzyło podczas wyłączania nie mozna użyć komendy start
                {cooldown[i] = message.createdTimestamp+180000}

                client.channels.cache.get(config.server_bot_channel).send("./home/magik/serwer") //komenda shutdown uruchamia plik (nie trzeba dzieki temu wpisywać sudo) z komendą shutdown
                setTimeout(function(){
                    client.channels.cache.get(config.server_bot_channel).send("-./shutdown.sh")
                },20*1000)

                setTimeout(function(){

                    const start = {
                        hostname: 'maker.ifttt.com',
                        port: 443,
                        path: config.stop,
                        method: 'GET',
                    };
        
                    const req = https.request(start, res => {
                        console.log(`statusCode: ${res.statusCode}`);
                    
                        res.on('data', d => {
                        process.stdout.write(d);
                        });
                    });
                    
                    req.on('error', error => {console.error(error);});
                    
                    req.end();
        
                    console.log(`serwer stopped`)
        
                },160*1000)
            }
        }

        stopping()
    }    
    else if(message.content.includes('Server has started'))
    {   
        check_status()
    }
    else if(message.author.id==config.hardware_bot&&message.content=='yep')
    { //Jak sie serwer uruchomi to włączy wszytskie serwery (jest to raczej do małych serwerów w domu, 
      //  które maja nie marnowac tyle prądu, wiec nie powinno tu być uzywane wiecej niz 2-3)

        console.log("server is starting")

        async function starting(i)
        { 
            return new Promise((resolve) => {
                setTimeout(function(){
                    client.channels.cache.get(config.server_bot_channel).send(config.servers[i+1])
                    setTimeout(function(){
                        client.channels.cache.get(config.server_bot_channel).send(config.servers[i+2])
                        resolve()
                    },3*1000)
                },3*1000)
            })
        }

        async function yep_loop()
        {
            for(let i = 0; i<servers.length ; i+=3)
            {
                await starting(i)
            }
        }

        yep_loop()
    }
})

client.login(config.token) //tu sie loguje

//MADE BY MaGiSter#0411
