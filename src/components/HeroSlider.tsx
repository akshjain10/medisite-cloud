'use client'

import { useEffect, useState } from 'react'
import { Autoplay, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import 'swiper/css'
import 'swiper/css/pagination'

type HeroImage = { url: string; alt: string }

function Slide({ image, first, overlay }: { image: HeroImage; first: boolean; overlay: number }) {
  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt}
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority={first ? 'high' : 'auto'}
        loading={first ? 'eager' : 'lazy'}
      />
      <div className="absolute inset-0 bg-black" style={{ opacity: overlay / 100 }} />
    </div>
  )
}

export default function HeroSlider({ images, overlay = 50, delayMs = 3000 }: { images: HeroImage[]; overlay?: number; delayMs?: number }) {
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  if (images.length === 1) return <Slide image={images[0]} first overlay={overlay} />

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      autoplay={reduceMotion ? false : { delay: delayMs, disableOnInteraction: false }}
      pagination={{ clickable: true, dynamicBullets: true }}
      speed={1000}
      loop
      className="hero-swiper h-full"
    >
      {images.map((image, i) => (
        <SwiperSlide key={image.url}>
          <Slide image={image} first={i === 0} overlay={overlay} />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
