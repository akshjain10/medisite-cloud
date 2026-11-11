'use client'

import { Children, useEffect, useState, type ReactNode } from 'react'
import { Autoplay, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import 'swiper/css'
import 'swiper/css/pagination'

type Props = {
  children: ReactNode
  /** Same shape as the reference page: { 640: { slidesPerView: 2 }, ... } */
  breakpoints?: Record<number, { slidesPerView: number }>
  autoplayMs?: number
  /** Swiper can only loop when there are more slides than fit on screen. The caller decides. */
  loop?: boolean
}

export default function Carousel({ children, breakpoints, autoplayMs = 5000, loop = false }: Props) {
  // Respect "reduce motion": no autoplay for people who asked for less movement.
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      autoplay={reduceMotion ? false : { delay: autoplayMs, disableOnInteraction: false, pauseOnMouseEnter: true }}
      pagination={{ clickable: true, dynamicBullets: true }}
      speed={500}
      loop={loop}
      spaceBetween={16}
      slidesPerView={1}
      breakpoints={breakpoints}
      className="pb-12"
    >
      {Children.toArray(children).map((child, i) => (
        <SwiperSlide key={i} className="h-auto!">
          {child}
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
