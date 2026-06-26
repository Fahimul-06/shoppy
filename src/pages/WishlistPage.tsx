import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { fetchWishlist } from '../lib/db';
import type { Product } from '../types';

export default function WishlistPage(){
 const [products,setProducts]=useState<Product[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{fetchWishlist().then(setProducts).catch(()=>setProducts([])).finally(()=>setLoading(false))},[]);
 return <div className="max-w-7xl mx-auto px-4 py-8"><Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to profile</Link><h1 className="text-2xl font-black mb-5 flex items-center gap-2"><Heart/> Wishlist</h1>{loading?<p>Loading wishlist...</p>:products.length===0?<div className="bg-white border rounded-2xl p-8 text-center text-gray-500">Your wishlist is empty.</div>:<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>}</div>
}
