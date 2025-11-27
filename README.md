# sunfish-karoo
Utility bot for Sunfish Village discord server. Right now it only works for the Sunfish Village server.

Its not public rn so you'll have to self host it:

# How to self host

## 1. Clone the repo

1. Clone the repo

2. Install the dependencies with `npm install`
    - make sure you have node installed (latest)

## 2. configuring config.json
1. Change the config.example.json file to your own values and rename it to config.json

### supabase
 create a supabase account and project. 
- **Supabase URL:** go to Connect -> App Framework -> copy the url
- **Supabase Service Key:** go to Project Settings -> API Keys -> New Secret Key -> Copy the key
- run init.sql in your db (go to SQL Editor tab -> paste the code and run)
### discord
create a testing bot and a main bot in https://discord.com/developers/applications.
1. enable the intents for guild messages, guild members, and message content ("Bot" tab)
2. go to Installation tab -> set to use Discord Provided Link -> enable all permissions and invite to ur server
3. go to your discord settings and enable developer mode

- **guildId:** right click on ur server name -> Copy Server ID

(You dont need to reset token if you already know it)
- **productionToken:** go to your main bot -> "Bot" -> Reset Token -> click "Copy"
- **devToken:** same as above but for testing bot

- **productionClientId:** go to your main bot -> General Information -> copy Application ID
- **devClientId:** same as above but for testing bot

## 3. Deploying
- cloudflare and vercel will not work with this, you'll have to use something like Render or Koyeb etc. 

### Render
render is free i found a funny loophole
Do not have multiple web services under a single workspace or you'll hit usage limit fast
1. create a new workspace
2. create a web service and import from your cloned github repo
3. set build command to `npm install` and start command to `npm run dev`
4. scroll all the way to the bottom and add the config.json as a secret file
5. deploy


### for other services
Haven't had much experience with others so here's a general guide:
1. import from github
2. add config.json as a secret file
3. set build command to `npm install` and start command to `npm run dev`
4. deploy
## Development
You may need to change channel ids and role ids in helpers.js and messageCreate.js
run `node deploy-commands.js` in the same directory as your bot's source code.

# Commands

## Moderation

- ban
- kick
- mute
- removepoints
- removetimeout
- punish
- unban
- unmute

## Utility

- closepost
- helpers
- ping
- reopenpost

## System

- ping
- reload


