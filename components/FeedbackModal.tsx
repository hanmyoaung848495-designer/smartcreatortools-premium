
import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card, Input } from './Shared';

export const FeedbackModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    message: '',
  });

  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    let id = localStorage.getItem('smart_creator_session_id');
    if (!id) {
      id = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('smart_creator_session_id', id);
    }
    setSessionId(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact || !formData.message) {
      setError('ကျေးဇူးပြု၍ အချက်အလက်အားလုံး ဖြည့်စွက်ပေးပါ');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) {
        setError('Telegram credentials are not configured. Please add VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID to your environment variables.');
        setIsSending(false);
        return;
      }

      const text = `<b>Smart Creator Feedback Received</b>\n\n` +
        `<b>Session ID :</b> <code>${sessionId}</code>\n` +
        `<b>Name :</b> <code>${formData.name}</code> <b>Email/Telegram:</b> <code>${formData.contact}</code>\n` +
        `<b>Message:</b>\n<code>${formData.message}</code>`;

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({ name: '', contact: '', message: '' });
        setTimeout(() => {
          setSuccess(false);
          setIsOpen(false);
        }, 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'ပို့ဆောင်မှု မအောင်မြင်ပါ');
      }
    } catch (err) {
      console.error("Feedback error:", err);
      setError(`ကွန်ရက် အမှားအယွင်း ဖြစ်ပေါ်နေပါသည်: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors"
        title="Feedback & Support"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Modal Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm"
            >
              <Card className="relative overflow-hidden border-orange-100 shadow-2xl">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">အကြံပြုစာများ</h3>
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">Feedback & Support</p>
                    </div>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {success ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="py-8 text-center space-y-3"
                    >
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <Send size={24} />
                      </div>
                      <h4 className="text-md font-bold text-gray-900 dark:text-white">ပေးပို့မှု အောင်မြင်ပါသည်</h4>
                      <p className="text-xs text-gray-500">ကျေးဇူးတင်ရှိပါသည်။</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">နာမည်</label>
                        <Input 
                          placeholder="သင်၏ နာမည်"
                          value={formData.name}
                          onChange={(val) => setFormData({ ...formData, name: val })}
                          className="border-gray-100 text-sm py-2"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gmail / Telegram</label>
                        <Input 
                          placeholder="ဆက်သွယ်ရန် လိပ်စာ"
                          value={formData.contact}
                          onChange={(val) => setFormData({ ...formData, contact: val })}
                          className="border-gray-100 text-sm py-2"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">မက်ဆေ့ချ်</label>
                        <textarea 
                          placeholder="အကြံပြုလိုသည်များကို ရေးသားပါ..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full min-h-[100px] p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                      </div>

                      {error && (
                        <p className="text-[10px] font-bold text-red-500 text-center">{error}</p>
                      )}

                      <Button 
                        type="submit"
                        disabled={isSending}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-[0.1em] shadow-lg shadow-orange-100 dark:shadow-none text-sm"
                      >
                        {isSending ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Sending...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Send size={16} />
                            Send
                          </div>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
