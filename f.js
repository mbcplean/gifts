const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const readline = require('readline');

// Global configuration
const DEFAULT_MAX = 100000;
const BLOCK_SIZE = 100;
const DELAY_MS = 2000; // 2 seconds delay between blocks for Option 3 & 4
// In-memory conversation state keyed by chatId
const state = {};

// Helper: Convert a number to emoji digits.
function numberToEmoji(num) {
  const mapping = {
    '0': '0️⃣',
    '1': '1️⃣',
    '2': '2️⃣',
    '3': '3️⃣',
    '4': '4️⃣',
    '5': '5️⃣',
    '6': '6️⃣',
    '7': '7️⃣',
    '8': '8️⃣',
    '9': '9️⃣'
  };
  return String(num).split('').map(ch => mapping[ch] || ch).join('');
}

// Helper: Delay function for async/await.
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Send message with retry on 429 (Too Many Requests)
async function sendMessageWithRetry(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (err) {
    // Check if error is due to rate limits (HTTP 429)
    if (err.response && err.response.statusCode === 429) {
      let retryAfter = (err.response.body.parameters && err.response.body.parameters.retry_after) || 2;
      console.log(`Rate limited. Waiting for ${retryAfter} seconds before retrying.`);
      await delay(retryAfter * 1000);
      return sendMessageWithRetry(chatId, text, options);
    } else {
      console.error('Error sending message:', err);
    }
  }
}

// Create readline interface to get the token from input.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your Telegram Bot Token: ', (token) => {
  token = token.trim();
  // Create the bot instance with polling enabled.
  const bot = new TelegramBot(token, { polling: true });

  // Save user info to file.
  function saveUser(user) {
    const data = `${new Date().toISOString()} - ID: ${user.id}, Username: ${user.username}\n`;
    fs.appendFile('users.txt', data, err => {
      if (err) console.error('Error writing to file:', err);
    });
  }

  // Main menu inline keyboard with four options.
  function sendMainMenu(chatId) {
    const mainMenu = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "1️⃣ (Jack_in_the_Box_bot)", callback_data: "default_paginated_1" }],
          [{ text: "2️⃣ (Information 🆔️)", callback_data: "info" }],
          [{ text: "3️⃣ (Send All Default Gifts in Chat)", callback_data: "send_all" }],
          [{ text: "4️⃣ (Custom Gift Options)", callback_data: "custom_options" }]
        ]
      }
    };
    sendMessageWithRetry(chatId, "Please choose an option:", mainMenu);
  }

  // Option 1: Send one block (paginated default gift)
  function sendDefaultBlock(chatId, startNum) {
    const endNum = Math.min(startNum + BLOCK_SIZE - 1, DEFAULT_MAX);
    let text = `&gt; <b>🚀 Gifts from 🎁 ${startNum} to ${endNum}</b>\n`;
    for (let i = startNum; i <= endNum; i++) {
      text += `${numberToEmoji(i)} http://t.me/nft/JackintheBox-${i}\n`;
    }
    // Navigation buttons: Next/Prev if applicable.
    const buttons = [];
    if (endNum < DEFAULT_MAX) {
      buttons.push({ text: "Next", callback_data: `default_paginated_${endNum + 1}` });
    }
    if (startNum > 1) {
      const prevStart = Math.max(1, startNum - BLOCK_SIZE);
      buttons.push({ text: "Prev", callback_data: `default_paginated_${prevStart}` });
    }
    const options = {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [buttons] }
    };
    sendMessageWithRetry(chatId, text, options);
  }

  // Option 3: Send all default gifts in chat (all blocks sequentially) with 2 sec delay.
  async function sendAllDefaultGifts(chatId) {
    await sendMessageWithRetry(chatId, "Starting to send all gift links. This may take a while.");
    for (let start = 1; start <= DEFAULT_MAX; start += BLOCK_SIZE) {
      const end = Math.min(start + BLOCK_SIZE - 1, DEFAULT_MAX);
      let text = `&gt; <b>✨ ${numberToEmoji(start)} to ${numberToEmoji(end)}</b>\n`;
      for (let i = start; i <= end; i++) {
        text += `${numberToEmoji(i)} http://t.me/nft/JackintheBox-${i}\n`;
      }
      await sendMessageWithRetry(chatId, text, { parse_mode: 'HTML' });
      await delay(DELAY_MS);
    }
  }

  // Option 4A: Custom gift links in current chat (using user's link template)
  async function sendAllCustomGifts(chatId, baseLink, maxQuantity) {
    await sendMessageWithRetry(chatId, "Sending all custom gift links in chat. This may take a while.");
    for (let start = 1; start <= maxQuantity; start += BLOCK_SIZE) {
      const end = Math.min(start + BLOCK_SIZE - 1, maxQuantity);
      let text = `&gt; <b>🌟 ${numberToEmoji(start)} to ${numberToEmoji(end)}</b>\n`;
      for (let i = start; i <= end; i++) {
        text += `${numberToEmoji(i)} ${baseLink}${i}\n`;
      }
      await sendMessageWithRetry(chatId, text, { parse_mode: 'HTML' });
      await delay(DELAY_MS);
    }
  }

  // Option 4B: Post custom gift links to a channel with 2 sec delay between blocks.
  async function sendAllCustomGiftsToChannel(chatId, baseLink, maxQuantity, channelId) {
    await sendMessageWithRetry(chatId, `Posting to channel ${channelId}. Ensure the bot is admin there.`);
    for (let start = 1; start <= maxQuantity; start += BLOCK_SIZE) {
      const end = Math.min(start + BLOCK_SIZE - 1, maxQuantity);
      let text = `&gt; <b>🔥 ${numberToEmoji(start)} to ${numberToEmoji(end)}</b>\n`;
      for (let i = start; i <= end; i++) {
        text += `${numberToEmoji(i)} ${baseLink}${i}\n`;
      }
      await sendMessageWithRetry(channelId, text, { parse_mode: 'HTML' });
      await delay(DELAY_MS);
    }
    sendMessageWithRetry(chatId, "Done posting to channel.");
  }

  // Handle /start command.
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    saveUser(msg.from);
    sendMessageWithRetry(chatId, "Hi welcome to Gifts info bot");
    sendMainMenu(chatId);
  });

  // Handle callback queries.
  bot.on('callback_query', (callbackQuery) => {
    const data = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    // Option 1: Default paginated block.
    if (data.startsWith("default_paginated_")) {
      let startNum = parseInt(data.split("_")[2], 10);
      if (isNaN(startNum)) startNum = 1;
      sendDefaultBlock(chatId, startNum);
    }
    // Option 2: User info.
    else if (data === "info") {
      const user = callbackQuery.from;
      const infoText = `Username: ${user.username}\nUser ID: ${user.id}`;
      sendMessageWithRetry(chatId, infoText);
    }
    // Option 3: Send all default gifts in chat.
    else if (data === "send_all") {
      sendAllDefaultGifts(chatId);
    }
    // Option 4: Custom gift options.
    else if (data === "custom_options") {
      state[chatId] = { step: "awaiting_custom_link" };
      sendMessageWithRetry(chatId, "Please send your custom gift link template (e.g., http://t.me/nft/Jackinthemall-):");
    }
    // Sub-options for custom gift:
    else if (data === "custom_chat") {
      if (state[chatId] && state[chatId].baseLink && state[chatId].quantity) {
        sendAllCustomGifts(chatId, state[chatId].baseLink, state[chatId].quantity);
        delete state[chatId];
      } else {
        sendMessageWithRetry(chatId, "Custom link or quantity not set. Please try again.");
      }
    }
    else if (data === "custom_channel") {
      if (state[chatId] && state[chatId].baseLink && state[chatId].quantity) {
        state[chatId].step = "awaiting_channel";
        sendMessageWithRetry(chatId, "Please enter the channel ID (or @channelusername) where the bot is admin:");
      } else {
        sendMessageWithRetry(chatId, "Custom link or quantity not set. Please try again.");
      }
    }
    bot.answerCallbackQuery(callbackQuery.id);
  });

  // Handle text messages for conversation steps.
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    // Skip commands.
    if (msg.text.startsWith('/')) return;
    if (state[chatId]) {
      // Step: awaiting custom link template.
      if (state[chatId].step === "awaiting_custom_link") {
        state[chatId].baseLink = msg.text.trim();
        state[chatId].step = "awaiting_custom_quantity";
        sendMessageWithRetry(chatId, "Please enter the quantity for your custom gift links (e.g., 100000 or 500000):");
      }
      // Step: awaiting custom quantity.
      else if (state[chatId].step === "awaiting_custom_quantity") {
        const qty = parseInt(msg.text.trim(), 10);
        if (isNaN(qty) || qty <= 0) {
          sendMessageWithRetry(chatId, "Invalid quantity. Please enter a positive number.");
        } else {
          state[chatId].quantity = qty;
          state[chatId].step = "custom_choice_made";
          // Present sub-menu for custom gift: Chat or Channel.
          const customMenu = {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Custom Chat", callback_data: "custom_chat" }],
                [{ text: "Custom Channel", callback_data: "custom_channel" }]
              ]
            }
          };
          sendMessageWithRetry(chatId, "Choose how you want to send your custom gift links:", customMenu);
        }
      }
      // Step: awaiting channel id.
      else if (state[chatId].step === "awaiting_channel") {
        const channelId = msg.text.trim();
        sendAllCustomGiftsToChannel(chatId, state[chatId].baseLink, state[chatId].quantity, channelId);
        delete state[chatId];
      }
    }
  });

  console.log("Bot is polling...");
  rl.close();
});