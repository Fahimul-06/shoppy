import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { heroSlides as fallbackSlides } from '../data/products';
import { api } from '../lib/api';

type Slide = { id: string; image: string; title?: string; subtitle?: string; link?: string };

export default function HeroBanner() {
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides as Slide[]);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    api.get<{ heroSlides?: Slide[] }>('/hero-slides?placement=hero')
      .then((res) => {
        const list = (res.heroSlides || []).filter((slide) => slide.image);
        if (list.length) { setSlides(list); setCurrent(0); }
      })
      .catch(() => {});
  }, []);

  const goTo = useCallback((index: number) => {
    if (animating || slides.length === 0) return;
    setAnimating(true);
    setCurrent(index);
    setTimeout(() => setAnimating(false), 500);
  }, [animating, slides.length]);

  const prev = () => goTo((current - 1 + slides.length) % slides.length);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (!slides.length) return null;

  const slideContent = (slide: Slide) => (
    <>
      <img src={slide.image} alt={slide.title || 'Shoppy offer'} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
      <div className="absolute inset-0 flex items-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-md">
          <p className="text-orange-400 font-semibold text-sm uppercase tracking-widest mb-2">Limited Time Offer</p>
          {slide.title && <h2 className="text-white text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3">{slide.title}</h2>}
          {slide.subtitle && <p className="text-gray-200 text-sm sm:text-base">{slide.subtitle}</p>}
        </div>
      </div>
    </>
  );

  return (
    <section className="bg-gray-50 pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden bg-gray-900 h-[180px] sm:h-[240px] lg:h-[300px] rounded-2xl shadow-sm">
          {slides.map((slide, index) => (
            <div key={slide.id || index} className={`absolute inset-0 transition-opacity duration-500 ${index === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {slide.link ? <Link to={slide.link} className="block relative w-full h-full">{slideContent(slide)}</Link> : <div className="relative w-full h-full">{slideContent(slide)}</div>}
            </div>
          ))}

          {slides.length > 1 && <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10" aria-label="Previous slide"><ChevronLeft size={20} /></button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10" aria-label="Next slide"><ChevronRight size={20} /></button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {slides.map((_, index) => <button key={index} onClick={() => goTo(index)} className={`transition-all duration-300 rounded-full ${index === current ? 'bg-orange-500 w-6 h-2' : 'bg-white/50 hover:bg-white/80 w-2 h-2'}`} aria-label={`Go to slide ${index + 1}`} />)}
            </div>
          </>}
        </div>
      </div>
    </section>
  );
}
