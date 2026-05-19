import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Crown, Zap, Shield, Star, Sparkles, CreditCard, ArrowLeft, Menu } from 'lucide-react';

interface PricingProps {
  onBack: () => void;
  onToggleMenu?: () => void;
  session: any;
}

const PLANS = [
  {
    name: "Free Plan",
    icon: <Zap className="text-gray-400" />,
    price: "0 Ks",
    period: "Forever",
    badge: "Basic",
    description: "အခြေခံစမ်းသပ် အသုံးပြုရန်",
    features: [
      "AI Voice and SRT — တစ်ရက်လျှင် (၂) ကြိမ်",
      "Upload Transcribe — တစ်ရက်လျှင် (၂) ကြိမ်",
      "Link Transcribe — တစ်ရက်လျှင် (၁) ကြိမ်",
      "ကြော်ငြာများ ပါဝင်ပါသည်"
    ],
    color: "from-gray-400 to-gray-500",
    bg: "bg-gray-500/5",
    border: "border-gray-200 dark:border-gray-800"
  },
  {
    name: "Monthly Plan",
    icon: <Star className="text-orange-500" />,
    price: "5,000 Ks",
    period: "/ လစဉ်",
    badge: "Popular",
    description: "လူကြိုက်အများဆုံး ပလန်",
    features: [
      "AI Voice and SRT — Unlimited",
      "Upload Transcribe — Unlimited",
      "Link Transcribe: 3 times / day (1-month validity)",
      "အခြား Premium Tools အားလုံး — Unlimited",
      "ကြော်ငြာအနှောင့်အယှက် လုံးဝမရှိ (Ad-Free)"
    ],
    color: "from-orange-500 to-amber-600",
    bg: "bg-orange-500/5",
    border: "border-orange-200 dark:border-orange-900/30",
    popular: true
  },
  {
    name: "Yearly Plan",
    icon: <Sparkles className="text-indigo-500" />,
    price: "30,000 Ks",
    period: "/ နှစ်ချုပ်",
    badge: "Best Value",
    description: "လစဉ်ကြေးထက် ၅၀% ပိုမိုသက်သာ",
    features: [
      "AI Voice and SRT — Unlimited",
      "Upload Transcribe — Unlimited",
      "Link Transcribe: 3 times / day (2- months validity)",
      "အခြား Premium Tools အားလုံး — Unlimited",
      "ကြော်ငြာအနှောင့်အယှက် လုံးဝမရှိ (Ad-Free)"
    ],
    color: "from-indigo-500 to-purple-600",
    bg: "bg-indigo-500/5",
    border: "border-indigo-200 dark:border-indigo-900/30"
  },
  {
    name: "Lifetime Plan",
    icon: <Crown className="text-pink-500" />,
    price: "60,000 Ks",
    period: "One-time",
    badge: "Ultimate",
    description: "တစ်ခါပဲပေးရုံနဲ့ တစ်သက်တာ အသုံးပြုနိုင်",
    features: [
      "AI Voice and SRT — Unlimited",
      "Upload Transcribe — Unlimited",
      "Link Transcribe: 3 times / day (3- months validity)",
      "အခြား Premium Tools အားလုံး — Unlimited",
      "တစ်သက်တာ အသုံးပြုနိုင်မည်"
    ],
    color: "from-pink-500 to-rose-600",
    bg: "bg-pink-500/5",
    border: "border-pink-200 dark:border-pink-900/30"
  }
];

const ConfirmModal = ({ isOpen, onConfirm, onCancel, planName }: { isOpen: boolean, onConfirm: () => void, onCancel: () => void, planName: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-sm relative z-[1001] shadow-2xl">
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">ဝယ်ယူမှာသေချာပါသလား?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{planName} ကို ဝယ်ယူရန်အတွက် Telegram bot သို့သွားပါမည်။</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">မလုပ်တော့ပါ</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700">သေချာပါတယ်</button>
        </div>
      </div>
    </div>
  );
};

const Pricing: React.FC<PricingProps> = ({ onBack, onToggleMenu, session }) => {
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, planName: string }>({ isOpen: false, planName: '' });

  const handleChoosePlan = (name: string) => {
    setConfirmModal({ isOpen: true, planName: name });
  };

  const executePlanPurchase = () => {
    window.open('https://t.me/kcteamofficialbot', '_blank');
    setConfirmModal({ isOpen: false, planName: '' });
  };
    // Helper to keep Pricing clean
    const PurchaseButton = ({ planName, popular, color }: { planName: string, popular?: boolean, color: string }) => (
        <button 
          onClick={() => handleChoosePlan(planName)}
          className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] ${
          popular 
            ? `bg-gradient-to-r ${color} text-white shadow-indigo-500/20 hover:shadow-indigo-500/40`
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500'
        }`}>
          Choose Plan
        </button>
    );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onConfirm={executePlanPurchase} 
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        planName={confirmModal.planName}
      />
      {/* ... keeping the rest of the component ... */}

      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-sm font-black tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Premium Plans
            </h1>
          </div>
          <button 
            onClick={onToggleMenu}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4"
          >
            <Sparkles size={12} />
            Smart Creator Tools
          </motion.div>
          
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
            Unlock your <span className="text-indigo-600">Full Potential</span>
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-lg mx-auto leading-relaxed">
            Kpay, Wave, Aya Pay များဖြင့် လွယ်ကူစွာ ဝယ်ယူရရှိနိုင်ပါပြီ။
            <br />
            <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500 mt-2 block">🔔 Gemini Service Needs API</span>
          </p>
        </div>

        {/* Rotating Gradient Header */}
        <div className="mb-12 flex justify-center">
          <div className="relative p-[2px] rounded-2xl overflow-hidden w-full max-w-sm">
            <style>
              {`
                @keyframes rotate-gradient {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .rotate-animation {
                  animation: rotate-gradient 3s linear infinite;
                }
              `}
            </style>
            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400 via-green-400 to-red-400 rotate-animation" />
            <div className="relative bg-white dark:bg-gray-950 rounded-[14px] px-6 py-4 flex items-center justify-center">
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-wider">KC TTS & SRT Plans</h3>
            </div>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex flex-col p-6 rounded-[2rem] border ${plan.border} ${plan.bg} backdrop-blur-sm transition-all hover:shadow-2xl hover:shadow-indigo-500/10 group overflow-hidden`}
            >
              {/* Glow Decoration */}
              <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-tr ${plan.color} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-full blur-3xl`} />

              <div className="flex items-center justify-between mb-6">
                <div className={`p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 transition-transform group-hover:scale-110 duration-500`}>
                  {plan.icon}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm`}>
                  {plan.badge}
                </span>
              </div>

              <div className="mb-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{plan.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-2xl font-black text-gray-900 dark:text-white">{plan.price}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{plan.period}</span>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className={`mt-0.5 p-0.5 rounded-full bg-gradient-to-tr ${plan.color} text-white`}>
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 leading-snug">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {session.user ? (
                // Only if logged in, check if this is the current plan
                (session.user.role === plan.name.toLowerCase().replace(' plan', '')) || (plan.name === 'Free Plan' && session.user.role === 'free')
                  ? (
                    <div className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700">
                      <Check size={14} /> Current Plan
                    </div>
                  )
                  : (
                    <button 
                      onClick={() => handleChoosePlan(plan.name)}
                      className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] ${
                      plan.popular 
                        ? `bg-gradient-to-r ${plan.color} text-white shadow-indigo-500/20 hover:shadow-indigo-500/40`
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500'
                    }`}>
                      Choose Plan
                    </button>
                  )
              ) : (
                // If not logged in
                plan.name === 'Free Plan' 
                  ? (
                    <div className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700">
                      <Check size={14} /> Current Plan
                    </div>
                  )
                  : (
                    <button 
                      onClick={() => handleChoosePlan(plan.name)}
                      className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] ${
                      plan.popular 
                        ? `bg-gradient-to-r ${plan.color} text-white shadow-indigo-500/20 hover:shadow-indigo-500/40`
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500'
                    }`}>
                      Choose Plan
                    </button>
                  )
              )}
            </motion.div>
          ))}
        </div>

        {/* Support Section */}
        <div className="mt-20 p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-100 dark:border-indigo-900/30 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full" />
          
          <div className="relative z-10">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Need help with payment?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">Customer Support ကို ဆက်သွယ်ပြီး အသေးစိတ် မေးမြန်းနိုင်ပါသည်။</p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <Shield size={18} className="text-green-500" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Secure Payment</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <CreditCard size={18} className="text-blue-500" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Kpay / Wave Pay</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
