import { dbService } from './dbService.js';
import TelegramBot from 'node-telegram-bot-api';

export const botService = {
  async handleStart(bot: TelegramBot, chatId: number) {
    bot.sendMessage(chatId, "👋 Welcome! Use /help to see commands.");
  },

  async handleHelp(bot: TelegramBot, chatId: number, adminChatId: string) {
    const currentId = String(chatId);
    if (currentId !== String(adminChatId).trim()) {
      bot.sendMessage(chatId, `⚠️ Unauthorized. Your ID is: ${currentId}.`);
      return;
    }
    const helpText = `
🤖 *Smart Creator Tools Bot*

📊 *Analytics:*
/stats - Today's visitors
/stats all - All time visitors
/stats YYYY-MM-DD - Visitors on a specific date

📚 *Tutorials:*
/post Title | Video Id | Time start | content | [tool_key] - Add a new tutorial
/listposts - List all tutorial videos
/delpost [id] - Delete a tutorial by ID
/checkpost [id] - Check details of a tutorial by ID

🎵 *Playlists:*
/playlist Video1Id | Time1 | Video2Id | Time2 | ... - Set the header video playlist
/listplaylist - List current playlist videos
/delplaylist - Clear the playlist

🚫 *Ban Management:*
/ban [session_id] - Ban a session ID
/unban [session_id] - Unban a session ID
/listbans - List all banned session IDs
/checkban [session_id] - Check if a session ID is banned

👤 *User Management:*
/users - List all user accounts
/adduser Name | ID | Password | Role | StartDate | Days / lifetime | Telegram
/deluser [username] - Delete a user account
/checkuser [username] - Check user account details

⚙️ *System:*
/setwebhook - Set/Reset the bot webhook URL
    `;
    bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
  },

  async handleStats(bot: TelegramBot, chatId: number, param: string | undefined) {
    const response = await dbService.getStats(param);
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error fetching stats: ${(response as any).error.message}`);
      return;
    }

    const toolCounts: Record<string, number> = {};
    ((response as any).data)?.forEach((row: any) => {
      toolCounts[row.tool] = (toolCounts[row.tool] || 0) + 1;
    });

    let statsText = `📊 *Stats for ${param || "Today"}*\n\nTotal Interactions: ${(response as any).count}\n\n*Tool Usage:*\n`;
    for (const [tool, c] of Object.entries(toolCounts)) {
      statsText += `- ${tool}: ${c}\n`;
    }
    bot.sendMessage(chatId, statsText, { parse_mode: "Markdown" });
  },

  async handlePost(bot: TelegramBot, chatId: number, input: string) {
    const parts = input.split('|').map(p => p.trim());
    if (parts.length < 4) {
      bot.sendMessage(chatId, "Invalid format. Use: /post Title | Video Id | Time start | content | [tool_key]");
      return;
    }
    const [title, video_id, time_start, content, tool_key] = parts;
    const parsedTime = parseInt(time_start, 10);
    const start = isNaN(parsedTime) ? 0 : parsedTime;
    const response = await dbService.addTutorial(title, video_id, start, content, tool_key || null);
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error adding tutorial: ${(response as any).error.message}`);
    } else {
      bot.sendMessage(chatId, "✅ Tutorial added successfully.");
    }
  },

  async handleListPosts(bot: TelegramBot, chatId: number) {
    const response = await dbService.listTutorials();
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error fetching tutorials: ${(response as any).error.message}`);
      return;
    }
    const data = (response as any).data;
    if (!data || data.length === 0) {
      bot.sendMessage(chatId, "No tutorials found.");
      return;
    }
    let listText = "📚 *Tutorial List:*\n\n";
    data.forEach((t: any) => {
      listText += `🆔 \`${t.id}\` | *${t.title}* ${t.tool_key ? `(\`${t.tool_key}\`)` : ""}\n`;
    });
    bot.sendMessage(chatId, listText, { parse_mode: "Markdown" });
  },

  async handleCheckPost(bot: TelegramBot, chatId: number, id: string) {
    const response = await dbService.getTutorial(id);
    if ((response as any).error || !(response as any).data) {
      bot.sendMessage(chatId, `❌ Error fetching tutorial: ${(response as any).error?.message || "Not found"}`);
      return;
    }
    const data = (response as any).data;
    const checkText = `
📚 *Tutorial Details:*
🆔 \`${data.id}\`
📌 *Title:* ${data.title}
🎥 *Video ID:* \`${data.video_id}\`
⏱️ *Start Time:* ${data.time_start}s
🛠️ *Tool Key:* \`${data.tool_key || "None"}\`
📝 *Content:*
${data.content}
    `;
    bot.sendMessage(chatId, checkText, { parse_mode: "Markdown" });
  },

  async handleDeletePost(bot: TelegramBot, chatId: number, id: string) {
    const response = await dbService.deleteTutorial(id);
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error deleting tutorial: ${(response as any).error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ Tutorial ${id} deleted.`);
    }
  },

  async handlePlaylist(bot: TelegramBot, chatId: number, input: string) {
    const parts = input.split('|').map(p => p.trim());
    if (parts.length % 2 !== 0) {
      bot.sendMessage(chatId, "Invalid format. Must be pairs of Video ID and Time start.");
      return;
    }
    const inserts = [];
    for (let i = 0; i < parts.length; i += 2) {
      inserts.push({
        video_id: parts[i],
        time_start: parseInt(parts[i+1]) || 0,
        order_index: i / 2
      });
    }
    const response = await dbService.setPlaylist(inserts);
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error setting playlist: ${(response as any).error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ Playlist updated with ${inserts.length} videos.`);
    }
  },

  async handleListPlaylist(bot: TelegramBot, chatId: number) {
    const response = await dbService.listPlaylist();
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error fetching playlist: ${(response as any).error.message}`);
      return;
    }
    const data = (response as any).data;
    if (!data || data.length === 0) {
      bot.sendMessage(chatId, "Playlist is empty.");
      return;
    }
    let listText = "🎵 *Current Playlist:*\n\n";
    data.forEach((p: any) => {
      listText += `🔹 Order: ${p.order_index} | Video ID: \`${p.video_id}\`\n`;
    });
    bot.sendMessage(chatId, listText, { parse_mode: "Markdown" });
  },

  async handleDelPlaylist(bot: TelegramBot, chatId: number) {
    const response = await dbService.clearPlaylist();
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error clearing playlist: ${(response as any).error.message}`);
    } else {
      bot.sendMessage(chatId, "✅ Playlist cleared.");
    }
  },

  async handleBan(bot: TelegramBot, chatId: number, sessionId: string) {
    const response = await dbService.banSession(sessionId);
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error banning session: ${(response as any).error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ Session ID \`${sessionId}\` has been banned.`);
    }
  },

  async handleUnban(bot: TelegramBot, chatId: number, sessionId: string) {
    const response = await dbService.unbanSession(sessionId);
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error unbanning session: ${(response as any).error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ Session ID \`${sessionId}\` has been unbanned.`);
    }
  },

  async handleListBans(bot: TelegramBot, chatId: number) {
    const response = await dbService.listBannedSessions();
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error fetching bans: ${(response as any).error.message}`);
      return;
    }
    const data = (response as any).data;
    if (!data || data.length === 0) {
      bot.sendMessage(chatId, "No banned sessions.");
      return;
    }
    let listText = "🚫 *Banned Sessions:*\n\n";
    data.forEach((b: any) => {
      listText += `- \`${b.session_id}\` (since ${new Date(b.created_at).toLocaleDateString()})\n`;
    });
    bot.sendMessage(chatId, listText, { parse_mode: "Markdown" });
  },

  async handleCheckBan(bot: TelegramBot, chatId: number, sessionId: string) {
    const response = await dbService.checkBan(sessionId);
    if ((response as any).error && (response as any).error.code !== 'PGRST116') {
      bot.sendMessage(chatId, `❌ Error checking ban: ${(response as any).error.message}`);
    } else if ((response as any).data) {
      bot.sendMessage(chatId, `🚫 Session ID \`${sessionId}\` is BANNED.`);
    } else {
      bot.sendMessage(chatId, `✅ Session ID \`${sessionId}\` is NOT banned.`);
    }
  },

  async handleListUsers(bot: TelegramBot, chatId: number) {
    const response = await dbService.listUsers();
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error fetching users: ${(response as any).error.message}`);
      return;
    }
    const data = (response as any).data;
    if (!data || data.length === 0) {
      bot.sendMessage(chatId, "No user accounts found.");
      return;
    }
    let listText = "👤 *User List:*\n\n";
    data.forEach((u: any) => {
      const status = u.is_lifetime ? "∞ Lifetime" : (u.expired_date < Date.now() ? "🔴 Expired" : "🟢 Active");
      listText += `• *${u.name}* (\`${u.username}\`)\n  └ ${status} | Role: ${u.role}\n`;
    });
    bot.sendMessage(chatId, listText, { parse_mode: "Markdown" });
  },

  async handleAddUserBot(bot: TelegramBot, chatId: number, input: string) {
    const parts = input.split('|').map(p => p.trim());
    if (parts.length < 6) {
      bot.sendMessage(chatId, "Invalid format. Use: /adduser Name | ID | Password | Role | StartDate | Days / lifetime | Telegram");
      return;
    }
    const [name, username, password, role, start_date_str, duration, telegram] = parts;
    
    let is_lifetime = duration.toLowerCase() === 'lifetime';
    let start_date = new Date(start_date_str).getTime() || Date.now();
    let expired_date: number | null = null;
    
    if (!is_lifetime) {
      const days = parseInt(duration, 10);
      if (isNaN(days)) {
        bot.sendMessage(chatId, "Invalid duration. Enter number of days or 'lifetime'.");
        return;
      }
      expired_date = start_date + (days * 24 * 60 * 60 * 1000);
    }

    const userData = {
      name,
      username,
      password,
      role: role.toLowerCase() === 'admin' ? 'admin' : 'user',
      start_date,
      expired_date,
      is_lifetime,
      telegram,
      created_at: Date.now()
    };

    const response = await dbService.addUser(userData);
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error adding user: ${(response as any).error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ User \`${username}\` added successfully.`);
    }
  },

  async handleCheckUserBot(bot: TelegramBot, chatId: number, username: string) {
    const response = await dbService.getUser(username);
    if ((response as any).error || !(response as any).data) {
      bot.sendMessage(chatId, `❌ User \`${username}\` not found.`);
      return;
    }
    const u = (response as any).data;
    const expDate = u.is_lifetime ? "Lifetime" : new Date(u.expired_date).toLocaleDateString();
    const startDate = new Date(u.start_date).toLocaleDateString();
    
    const text = `
👤 *User Details:*
🆔 *Username:* \`${u.username}\`
🔑 *Password:* \`${u.password}\`
📛 *Name:* ${u.name}
🛡️ *Role:* ${u.role}
📅 *Start:* ${startDate}
⌛ *Expiry:* ${expDate}
📱 *Device:* \`${u.device_id || "Not bound"}\`
✈️ *Telegram:* ${u.telegram || "N/A"}
🕒 *Last Login:* ${u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
    `;
    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  },

  async handleDeleteUserBot(bot: TelegramBot, chatId: number, username: string) {
    const response = await dbService.deleteUser(username);
    if ((response as any).error) {
      bot.sendMessage(chatId, `❌ Error deleting user: ${(response as any).error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ User \`${username}\` deleted.`);
    }
  }
};
