import React from 'react';
import { Briefcase, Mail, Users } from 'lucide-react';

export default function CareersPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><Briefcase className="text-orange-500"/> Careers</h1>
      <p className="text-gray-600 mb-8">Join Shoppy and help build a better online shopping experience for customers, sellers, and delivery teams.</p>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-lg mb-3 flex items-center gap-2"><Users className="text-orange-500"/> Open roles</h2>
          <p className="text-gray-600 text-sm leading-relaxed">Current openings will be published here. You can also send your CV for future opportunities.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-lg mb-3 flex items-center gap-2"><Mail className="text-orange-500"/> Apply</h2>
          <p className="text-gray-600 text-sm">Email your CV to <span className="font-bold text-gray-900">careers@shoppy.com</span>.</p>
        </div>
      </div>
    </div>
  );
}
