# sunfish-karoo
Utility bot for Sunfish Village discord server. Right now it only works for the Sunfish Village server.

Its not public rn so you'll have to self host it:

# How to self host

## 1. Clone the repo

1. Clone the repo

2. Install the dependencies with `npm install`
    - make sure you have node installed (latest)

## 2. Configure the environment

Copy `.env.example` to `.env` and fill in the values.

### MongoDB

Create a MongoDB Atlas project and database.

- **MongoDB URI:** copy the connection string from Atlas and set `MONGODB_URI`.
- **Database name:** optionally set `MONGODB_DATABASE`; otherwise the bot uses `development` or `production` based on `DEV_MODE`.
### discord
create a testing bot and a main bot in https://discord.com/developers/applications.
1. enable the guild members intent ("Bot" tab)
2. go to Installation tab, set it to use a Discord Provided Link, choose only the permissions needed by the utility and festival features, and invite it to your server
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
4. Add the values from `.env.example` as environment variables.
5. deploy


### for other services
Haven't had much experience with others so here's a general guide:
1. import from github
2. Add the values from `.env.example` as environment variables.
3. set build command to `npm install` and start command to `npm run dev`
4. deploy
## Development
You may need to change channel IDs and role IDs in `helpers.js` and the member join/leave event files.
run `node deploy-commands.js` in the same directory as your bot's source code.

# Commands

## Utility

- closepost
- helpers
- ping
- reopenpost

## System

- ping
- reload


