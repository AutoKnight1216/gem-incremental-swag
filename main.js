const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const fs = require('fs/promises');
const path =  require('node:path');

const SUPABASE_URL = "https://igrddscmrdrrwtvyspbf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_RXjn6yN0RuJn1CdJ_nJTCQ_0aixEAqI";
const folderPath = path.join(process.cwd(), 'data');
const coolPath = path.join(process.cwd(), 'cooltext.txt')

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            flowType: "pkce",
        }
    }
);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const commands = new Map();

commands.set("help", help);
commands.set("auth", auth);
commands.set("exit", exit);
commands.set("login", login);
commands.set("data", data);
commands.set("search", search);
commands.set("find", find);
commands.set("roll", roll);

async function main() {
    const coolText = await fs.readFile(coolPath, 'utf8');
    console.info('\x1b[35m%s\x1b[0m', coolText);
    console.log("Made by AutoKnight");
    console.log("Enter help to see options.");

    while (true) {
        const input = await question("> ");

        const parts = input.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        if (commands.has(command)) {
            await commands.get(command)(args);
        } else {
            console.log("Error: Invalid command.");
        }
    }
}

function getCooldownMs(nextRollAt) {
    const nextRollTime = new Date(nextRollAt).getTime();
    const now = Date.now();
    if (!Number.isFinite(nextRollTime)) {
        throw new Error("Invalid nextRollAt date.");
    }
    return Math.max(0, nextRollTime - now);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function help() {
    console.log(`Available commands:
    AUTH
      Sign into Gem Incremental.

    EXIT
      Exit.
    
    LOGIN
      Check signed in status.
    
    DATA
      Download a users data. Arguments: -i, user's id. -u, user's username. *, every user (NOT RECOMMENDED), -f, every 
      user whose username starts with that character.
    
    SEARCH
      Looks up a user and returns their profile along with extra data. Arguments: -l, user's username.

    FIND
      Finds a username. Arguments: -f, user's username.

    ROLL
      Rolls on Gem Incremental. Specify how many times you want to roll and leave blank for once.
`);
}

async function auth() {
    const email = await question("Input email: ");
    const password = await question("Input password: ")

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
    });

    if (error) {
        console.error("Sign-in failed:", error.message);
        return;
    }

    if (data.user) {
        console.log("Logged in!");
    }
}

async function login(){
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        console.log("Not logged in.")
    }else{
        console.log(`Logged in as: ${user.email}`);
    }
}

async function data(args) {
    if (args.length === 0) {
        console.log("No parameters, see help")
        return;
    }
    let query = supabase
        .from("players")
        .select("*");

    const option = args[0];
    switch (option) {
        case "-i":
            if (!args[1]) {
                console.log("Error: Missing user ID.");
                return;
            }
            query = query.eq("id", args[1]);
            break;
        case "-u":
            if (!args[1]) {
                console.log("Error: Missing username.");
                return;
            }
            query = query.ilike("username", args[1]);
            break;
        case "-l":
            if (!args[1]) {
                console.log("Error, Missing character.");
                return;
            }
            query = query.ilike("username", `${args[1]}%`);
            break;
        case `*`:
            let doom = await question("This will download the data of EVERY USER. Are you sure you want to do this? (y/n) ");
            doom = doom.toUpperCase();
            if (doom == "Y"){
                console.log("your cooked");
                query = query.select("*");
            }else{
                return;
            } break;
        default:
            console.log("Error, Invalid option.");
            return;
    }
    const { data: players, error } = await query;
    if (error) {
        console.error("Failed to retrieve data:", error.message);
        return;
    }
    if (!players || players.length === 0) {
        console.log("No users found.");
        return;
    }
    console.log("Data grabbed, saving to folder 'data'...");
    try {
        await fs.mkdir(folderPath, { recursive: true });
        for (const player of players) {
            const username = player.username;
            const id = player.id;
            await fs.writeFile(path.join(folderPath, `${username}.json`), JSON.stringify(player, null, 2));
            console.log(`${username}, (${id})`);
        }
    } catch (error) {
        console.error("Failed to save data:", error);
    }
}

async function search(args){
    if (args.length === 0) {
        console.log("No parameters, see help")
        return;
    }
    let query = supabase
        .from("players")
        .select("*");

    const option = args[0];
    switch (option) {
        case "-l":
            if (!args[1]) {
                console.log("Error: Missing username.");
                return;
            }
            query = query.ilike("username", args[1]);
            break;
        default:
            console.log("Error, Invalid option.");
            return;
    }
    const { data: player, error } = await query;
    if (error) {
        console.error("Failed to retrieve data:", error.message);
        return;
    }
    if (!player || player.length === 0) {
        console.log("No user found.");
        return;
    }
    console.log("User found.");
    try {
        const username = player[0]?.username ?? null;
        const id = player[0]?.id ?? null;
        const date = new Date(player[0]?.last_seen ?? null);
        let title = player[0]?.display_title ?? null;
        let leaderboard = player[0]?.leaderboard_hidden ?? null;
        if (leaderboard == true){
            leaderboard = "Banned."
        }else{
            leaderboard = "Not banned."
        }
        if (title == ''){
            title = "No title."
        }
        console.log("Username:", `${username}`);
        console.log("Title:", `${title}`);
        console.log("Leaderboard banned?", `${leaderboard}`)
        console.log("Last online:", `${date}`);
        console.log("Profile:", `https://gemincremental.com/user/${id}/`);
        return;
    } catch (error) {
        console.error("Failed to get data:", error);
    }
}

async function find(args){
    if (args.length === 0) {
        console.log("No parameters, see help")
        return;
    }
    let query = supabase
        .from("players")
        .select("*");

    const option = args[0];
    switch (option) {
        case "-f":
            if (!args[1]) {
                console.log("Error, Missing character.");
                return;
            }
            query = query.ilike("username", `${args[1]}%`);
            break;
        case `*`:
            query = query.select("*");
            break;
        default:
            console.log("Error, Invalid option.");
            return;
    }
    const { data: players, error } = await query;
    if (error) {
        console.error("Failed to find user:", error.message);
        return;
    }
    if (!players || players.length === 0) {
        console.log("No users found.");
        return;
    }
    console.log("Users found!");
    try {
        for (const player of players) {
            const username = player.username;
            const id = player.id;
            if (username !== null || undefined){
                console.log(`${username}, (${id})`);
            }
        }
    } catch (error) {
        console.error("Failed to find user:", error);
    }
}


async function roll(args) {
    if (args.length === 0) {
        console.log("No parameters, see help");
        return;
    }
    const {
        data: { session },
        error
    } = await supabase.auth.getSession();
    if (error || !session) {
        console.error("Not signed in.");
        return;
    }
    const continuous = args[0] === "-a";
    const times = Number(args[0]);
    if (!continuous && (!Number.isInteger(times) || times < 1)) {
        console.log("Invalid! Use a positive number or -a.");
        return;
    }
    const url = `${SUPABASE_URL}/functions/v1/roll`;
    let running = true;
    let completed = 0;
    async function requestRoll() {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_PUBLISHABLE_KEY,
                "Authorization": `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                batchSize: 1,
                pool: "normal"
            })
        });
        const result = await response.json();
        if (!response.ok) {
            if (result.nextRollAt) {
                const cooldownMs = getCooldownMs(result.nextRollAt);

                if (cooldownMs > 0) {
                    console.log(
                        `Waiting ${Math.ceil(cooldownMs / 1000)} seconds for cooldown.`
                    );

                    await sleep(cooldownMs);
                    return false; 
                }
            }
            console.error(`HTTP ${response.status}:`, result);
            throw new Error("Roll request failed.");
        }
        console.log(`Gem '${result.gem.name}' rolled. Sold? ${result.gemFilter.sell}`);
        return true;
    }

    try {
        while (running && (continuous || completed < times)) {
            const success = await requestRoll();
            if (success) {
                completed++;
            }
        }
        console.log(`Finished. ${completed} rolls.`);
    } catch (error) {
        console.error("Request failed:", error.message);
    }
}

function exit() {
    console.log("Exiting...");
    rl.close();
    process.exit(0);
}

main().catch((error) => {
    console.error("Fatal error:", error);
    rl.close();
});