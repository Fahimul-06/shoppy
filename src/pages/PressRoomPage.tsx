import React from 'react';
import { Mail, Newspaper } from 'lucide-react';

export default function PressRoomPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><Newspaper className="text-orange-500"/> Press Room</h1>
      <p className="text-gray-600 mb-8">Find Shoppy announcements, media contact information, and company updates.</p>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-black text-xl mb-3">Media contact</h2>
        <div className="flex gap-3 text-gray-700"><Mail className="text-orange-500"/><span>press@shoppy.com</span></div>
      </div>
    </div>
  );
}
