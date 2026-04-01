/**
 * ReviewsSection Component
 * 
 * Displays user testimonials and reviews.
 * Features animated review cards with avatars and content.
 */

import { motion } from "motion/react";
import { Star } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { reviewsContent, reviews } from "../../constants/homePageContent";
import { ScrollWaveReveal } from "../../components/background/ScrollWaveReveal";

export function ReviewsSection() {
  const { language, dir } = useLanguage();

  return (
    <motion.section
      id="reviews"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex items-center justify-center py-24 px-4 sm:px-8 relative"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Scroll Wave Reveal Effect */}
      <ScrollWaveReveal sectionIndex={3} />
      <div className="max-w-7xl mx-auto w-full relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.16, 1, 0.3, 1],
            delay: 0.1
          }}
          className="text-center mb-16"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 800,
              color: "#383e4e",
            }}
          >
            {reviewsContent.title[language]}
          </h2>
          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              color: "#5a5e6a",
            }}
          >
            {reviewsContent.subtitle[language]}
          </p>
        </motion.div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ 
                delay: 0.2 + index * 0.08, 
                duration: 1, 
                ease: [0.16, 1, 0.3, 1]
              }}
              whileHover={{
                scale: 1.03,
                y: -8,
                transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
              }}
              className={`relative p-8 rounded-3xl group ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(90, 94, 106, 0.1)",
                transformStyle: "preserve-3d",
              }}
              dir={dir}
            >
              {/* Gradient Glow */}
              <motion.div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                style={{
                  background: "linear-gradient(135deg, rgba(159, 95, 128, 0.15), rgba(90, 94, 106, 0.08))",
                  filter: "blur(25px)",
                }}
              />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <Star
                      className="w-5 h-5"
                      fill="#9F5F80"
                      style={{ color: "#9F5F80" }}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Review Content */}
              <p
                className="mb-6"
                style={{
                  fontSize: "1rem",
                  color: "#5a5e6a",
                  lineHeight: 1.7,
                  fontStyle: "italic",
                }}
              >
                "{review.content[language]}"
              </p>

              {/* Author Info */}
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <motion.div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    backgroundColor: "rgba(159, 95, 128, 0.1)",
                    border: "2px solid rgba(159, 95, 128, 0.2)",
                  }}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  {review.avatar}
                </motion.div>

                {/* Name and Role */}
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#383e4e",
                      fontSize: "1.125rem",
                    }}
                  >
                    {review.name}
                  </div>
                  <div
                    style={{
                      color: "#5a5e6a",
                      fontSize: "0.875rem",
                      opacity: 0.8,
                    }}
                  >
                    {review.role[language]}
                  </div>
                </div>
              </div>

              {/* Quote Decoration */}
              <motion.div
                className="absolute top-4 right-4 opacity-10"
                style={{
                  fontSize: "4rem",
                  color: "#9F5F80",
                  lineHeight: 1,
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.5,
                }}
              >
                "
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
