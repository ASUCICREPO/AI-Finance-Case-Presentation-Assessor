'use client';

import { HelpCircle, BookOpen, MessageCircle, Mail } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-serif">Help Center</h1>
      <p className="mt-2 text-sm text-gray-500 font-sans">
        Get help with the assessment platform.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          { icon: BookOpen, title: 'How it works', desc: 'Learn about the Q&A assessment process and what to expect.' },
          { icon: HelpCircle, title: 'FAQ', desc: 'Common questions about the platform, scoring, and sessions.' },
          { icon: MessageCircle, title: 'Technical Issues', desc: 'Camera, microphone, or connection problems during sessions.' },
          { icon: Mail, title: 'Contact Support', desc: 'Reach out to your TA or instructor for additional help.' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow cursor-pointer">
            <item.icon size={24} className="text-maroon-600" />
            <h3 className="mt-3 text-sm font-bold text-gray-900 font-sans">{item.title}</h3>
            <p className="mt-1 text-xs text-gray-500 font-sans">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
