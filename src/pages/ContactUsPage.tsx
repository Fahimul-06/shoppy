import React from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

export default function ContactUsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Contact Us</h1>
      <p className="text-gray-600 mb-8">Reach Shoppy customer care for order, payment, return, refund, and delivery support.</p>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-lg mb-4 flex items-center gap-2"><MessageCircle className="text-orange-500"/> Live Chat</h2>
          <p className="text-gray-600 text-sm mb-4">Click the floating Customer Care button at the lower corner of the customer website to start live chat.</p>
          <div className="bg-orange-50 text-orange-700 rounded-xl p-4 text-sm font-semibold">Customer Care is available every day.</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex gap-3"><Phone className="text-orange-500"/><div><p className="font-bold">Support Time</p><p className="text-sm text-gray-600">9 am - 9 pm Everyday</p></div></div>
          <div className="flex gap-3"><Mail className="text-orange-500"/><div><p className="font-bold">Email</p><p className="text-sm text-gray-600">support@shoppy.com</p></div></div>
          <div className="flex gap-3"><MapPin className="text-orange-500"/><div><p className="font-bold">Address</p><p className="text-sm text-gray-600">Rahman Regnum Centre, Level-6, 191/1, Tejgaon C/A, Dhaka-1208, Bangladesh</p></div></div>
        </div>
      </div>
    </div>
  );
}
