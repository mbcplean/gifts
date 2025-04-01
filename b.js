const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const readline = require('readline');

const MAX_LINK = 100000;
const BLOCK_SIZE = 100;

// Create readline interface to get the token from input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your Telegram Bot Token: ', (token) => {
  // Create the bot instance with polling enabled
  const bot = new TelegramBot(token.trim(), { polling: true });

  // Save user info to file (users.txt)
  function saveUser(user) {
    const data = `${new Date().toISOString()} - ID: ${user.id}, Username: ${user.username}\n`;
    fs.appendFile('users.txt', data, (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      }
    });
  }

  // Handle /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    saveUser(msg.from);
    bot.sendMessage(chatId, 'Hi welcome to Gifts info bot');

    // Inline menu with two options
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "1️⃣ (Jack_in_the_Box_bot)", callback_data: "jack_1" }],
          [{ text: "2️⃣ (Information 🆔️)", callback_data: "info" }]
        ]
      }
    };
    bot.sendMessage(chatId, "Please choose an option:", options);
  });

  // Handle callback queries from inline buttons
  bot.on('callback_query', (callbackQuery) => {
    const data = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    if (data.startsWith('jack_')) {
      // Get the starting number from callback data
      let startNum = parseInt(data.split('_')[1], 10);
      if (isNaN(startNum)) startNum = 1;
      sendLinks(chatId, startNum);
    } else if (data === 'info') {
      const user = callbackQuery.from;
      const infoText = `Username: ${user.username}\nUser ID: ${user.id}`;
      bot.sendMessage(chatId, infoText);
    } else {
      bot.sendMessage(chatId, "Invalid selection.");
    }

    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id);
  });

  // Function to send a block of links with navigation buttons
  function sendLinks(chatId, startNum) {
    const endNum = Math.min(startNum + BLOCK_SIZE - 1, MAX_LINK);
    let text = `> *Gifts from 🎁 ${startNum} to ${endNum}*\n`;
    for (let i = startNum; i <= endNum; i++) {
      text += `http://t.me/nft/JackintheBox-${i}\n`;
    }
    
    // Build navigation inline keyboard
    const buttons = [];
    if (endNum < MAX_LINK) {
      buttons.push({ text: "Next", callback_data: `jack_${endNum + 1}` });
    }
    if (startNum > 1) {
      const prevStart = Math.max(1, startNum - BLOCK_SIZE);
      buttons.push({ text: "Prev", callback_data: `jack_${prevStart}` });
    }
    
    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [buttons]
      }
    };
    bot.sendMessage(chatId, text, options);
  }

  console.log('Bot is polling...');
  rl.close();
});