import { useEffect, useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'

const DRAG_BUFFER = 50
const VELOCITY_THRESHOLD = 500
const GAP = 16
const SPRING_OPTIONS = { type: 'spring', stiffness: 200, damping: 25, mass: 0.5 }

const DoctorBenefitsCarousel = ({
  items = [],
  baseWidth = 320,
  autoplay = true,
  autoplayDelay = 3500,
  pauseOnHover = true,
  loop = true,
}) => {
  const containerPadding = 0
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  
  // Responsive width: smaller on mobile, bigger on desktop
  const responsiveWidth = useMemo(() => {
    if (windowWidth < 640) {
      // Mobile: 280px
      return 280
    } else if (windowWidth < 1024) {
      // Tablet: 320px
      return 320
    } else {
      // Desktop: 400px
      return 400
    }
  }, [windowWidth])
  
  const itemWidth = responsiveWidth
  const trackItemOffset = itemWidth + GAP

  const carouselItems = useMemo(() => items, [items])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current
      const handleMouseEnter = () => setIsHovered(true)
      const handleMouseLeave = () => setIsHovered(false)
      container.addEventListener('mouseenter', handleMouseEnter)
      container.addEventListener('mouseleave', handleMouseLeave)
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter)
        container.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [pauseOnHover])

  useEffect(() => {
    if (autoplay && !isDragging && (!pauseOnHover || !isHovered)) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => {
          const actualIndex = prev % items.length
          if (actualIndex === items.length - 1) {
            return 0
          }
          return actualIndex + 1
        })
      }, autoplayDelay)
      return () => clearInterval(timer)
    }
  }, [autoplay, autoplayDelay, isHovered, isDragging, loop, items.length, pauseOnHover])

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (_, info) => {
    setIsDragging(false)
    const offset = info.offset.x
    const velocity = info.velocity.x
    const actualIndex = currentIndex % items.length
    
    if (Math.abs(offset) < DRAG_BUFFER && Math.abs(velocity) < VELOCITY_THRESHOLD) {
      // Snap back to current position - no change
      return
    }

    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      // Next
      setCurrentIndex((prev) => {
        const idx = prev % items.length
        if (idx === items.length - 1) {
          return 0
        }
        return idx + 1
      })
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      // Previous
      setCurrentIndex((prev) => {
        const idx = prev % items.length
        if (idx === 0) {
          return items.length - 1
        }
        return idx - 1
      })
    }
  }

  const dragConstraints = useMemo(() => {
    if (!loop && items.length > 1) {
      return {
        left: -trackItemOffset * (items.length - 1),
        right: 0,
      }
    }
    return undefined
  }, [loop, trackItemOffset, items.length])

  if (!items.length) return null

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        minHeight: windowWidth < 640 ? '260px' : windowWidth < 1024 ? '280px' : '320px',
      }}
    >
      {/* Carousel Viewport - Shows only one card */}
      <div
        className="relative mx-auto overflow-hidden"
        style={{
          width: `${itemWidth}px`,
          maxWidth: '100%',
        }}
      >
        <motion.div
          className="flex"
          drag="x"
          dragConstraints={dragConstraints}
          dragElastic={0.15}
          dragMomentum={false}
          style={{
            gap: `${GAP}px`,
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          animate={{
            x: -(currentIndex % items.length) * trackItemOffset,
          }}
          transition={SPRING_OPTIONS}
        >
          {carouselItems.map((item, index) => {
            const IconComponent = item.icon
            
            return (
              <motion.div
                key={`${item.title}-${index}`}
                className="relative shrink-0 flex flex-col cursor-grab active:cursor-grabbing"
                style={{
                  width: `${itemWidth}px`,
                  minHeight: windowWidth < 640 ? '260px' : windowWidth < 1024 ? '280px' : '320px',
                  flexShrink: 0,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Transparent Glass Card */}
                <div className="relative h-full w-full flex flex-col rounded-2xl overflow-hidden group transition-all duration-500 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl">
                  {/* Glass gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                  
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-2xl" />
                  
                  {/* Content - Proper spacing and wrapping */}
                  <div className="relative z-10 p-4 sm:p-5 lg:p-6 flex flex-col h-full w-full">
                    {/* Icon Container with Glass Effect */}
                    <div className="mb-3 sm:mb-4 lg:mb-5 shrink-0">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg group-hover:bg-white/15 group-hover:backdrop-blur-lg group-hover:border-white/30 group-hover:shadow-xl transition-all duration-500 group-hover:scale-110">
                        <IconComponent className="text-xl sm:text-2xl lg:text-3xl text-white drop-shadow-md group-hover:drop-shadow-lg transition-all duration-500" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white mb-2 sm:mb-3 leading-snug group-hover:text-white transition-colors duration-300 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm lg:text-sm text-white/75 leading-relaxed group-hover:text-white/85 transition-colors duration-300 line-clamp-3 sm:line-clamp-4 overflow-hidden text-ellipsis">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Bottom glass accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
      <div className="flex w-full justify-center">
        <div className="mt-4 flex w-[150px] justify-between px-8 pb-4">
          {items.map((_, index) => (
            <motion.div
              key={index}
              className={`h-2 w-2 rounded-full cursor-pointer transition-colors duration-150 ${
                currentIndex % items.length === index
                  ? 'bg-white'
                  : 'bg-white/40'
              }`}
              animate={{
                scale: currentIndex % items.length === index ? 1.2 : 1,
              }}
              onClick={() => setCurrentIndex(index)}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default DoctorBenefitsCarousel

