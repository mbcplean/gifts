import logging
import os
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ParseMode
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, CallbackContext

# Use input to get the bot token at runtime.
TOKEN = input("Enter your Telegram Bot Token: ").strip()

MAX_LINK = 100000
BLOCK_SIZE = 100

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)
logger = logging.getLogger(__name__)

def save_user(user):
    """
    Save user information to a file.
    Each entry includes user id, username, and timestamp.
    """
    data = f"{datetime.now()} - ID: {user.id}, Username: {user.username}\n"
    with open("users.txt", "a") as f:
        f.write(data)

def start(update: Update, context: CallbackContext):
    """Handle /start command."""
    user = update.effective_user
    save_user(user)
    
    # Welcome message
    update.message.reply_text("Hi welcome to Gifts info bot")
    
    # Main menu inline keyboard
    keyboard = [
        [InlineKeyboardButton("1️⃣ (Jack_in_the_Box_bot)", callback_data="jack_1")],
        [InlineKeyboardButton("2️⃣ (Information 🆔️)", callback_data="info")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text("Please choose an option:", reply_markup=reply_markup)

def send_links(chat_id: int, start_num: int, context: CallbackContext):
    """
    Sends a single message with a block of links and navigation buttons.
    The header is in Telegram’s quote style.
    """
    end_num = min(start_num + BLOCK_SIZE - 1, MAX_LINK)
    # Build the header (quote style) and links.
    message_lines = [f"> *Gifts from 🎁 {start_num} to {end_num}*"]
    for i in range(start_num, end_num + 1):
        message_lines.append(f"http://t.me/nft/JackintheBox-{i}")
    text = "\n".join(message_lines)
    
    # Prepare inline buttons for pagination.
    buttons = []
    if end_num < MAX_LINK:
        buttons.append(InlineKeyboardButton("Next", callback_data=f"jack_{end_num + 1}"))
    if start_num > 1:
        prev_start = max(1, start_num - BLOCK_SIZE)
        buttons.append(InlineKeyboardButton("Prev", callback_data=f"jack_{prev_start}"))
    
    reply_markup = InlineKeyboardMarkup([buttons]) if buttons else None
    
    context.bot.send_message(
        chat_id=chat_id,
        text=text,
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=reply_markup
    )

def button_handler(update: Update, context: CallbackContext):
    """Handle all callback queries."""
    query = update.callback_query
    query.answer()  # Acknowledge the callback
    
    data = query.data
    if data.startswith("jack_"):
        # Extract the starting number from callback data.
        try:
            start_num = int(data.split("_")[1])
        except (IndexError, ValueError):
            start_num = 1
        # Send the block of links.
        send_links(query.message.chat_id, start_num, context)
    elif data == "info":
        user = query.from_user
        info_text = f"Username: {user.username}\nUser ID: {user.id}"
        query.edit_message_text(text=info_text)
    else:
        query.edit_message_text(text="Invalid selection.")

def main():
    """Start the bot."""
    updater = Updater(TOKEN, use_context=True)
    dp = updater.dispatcher
    
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CallbackQueryHandler(button_handler))
    
    # Start polling for updates from Telegram.
    updater.start_polling()
    logger.info("Bot started...")
    updater.idle()

if __name__ == '__main__':
    main()