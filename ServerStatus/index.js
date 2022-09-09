const config  = require("./config.json")
const Discord = require('discord.js')
const {Client,Intents} = require("discord.js") 

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
    ]
});

client.on ("ready" , () => {

    console.log('redy') 
    client.channels.cache.get(config.channel).send("yep")

})

var path = "/"
var comm = ""

client.on("messageCreate",message => {
    if(message.author.id==config.admin)
    {
        if(message.channel.id==config.channel)
        {
            if(message.content.startsWith('-')) //zaczynasz z myslnikiem aby wykonac komende
            {
                comm=message.content.replace('-','')

                setTimeout(function(){

                    console.log(comm)
                    console.log(path)

                    const { exec } = require("child_process");

                    exec(comm, {cwd: path}, (error, stdout, stderr) => {
                        if (error) {
                            message.channel.send(`error: ${error.message}`);
                            return;
                        }
                        if (stderr) {
                            message.channel.send(`stderr: ${stderr}`);
                            return;
                        }
                        message.channel.send(`stdout: ${stdout}`);
                    });

                },1000)
            }
            else if(message.content.startsWith('.')) //zaczynasz z kropka aby ustawic sciezke
            {

                path=message.content.replace('.','')
                setTimeout(function(){
                    message.channel.send(`path set to: ${path}`)
                },1000)
            }
        }
        if(message.content=='online.status')
        {
            message.channel.send('online')
        }
    }
})

client.login(config.token)