import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { useLanguage } from "../../contexts/LanguageContext";
import { companyTranslations } from "../../utils/translations";
import {
  Eye,
  Keyboard,
  Monitor,
  Type,
  Zap,
  Image as ImageIcon,
  Code,
  Tag,
  Mail,
} from "lucide-react";

export function AccessibilityPage() {
  const { language, dir } = useLanguage();
  const { accessibility } = companyTranslations;
  const textAlign = dir === 'rtl' ? 'right' : 'left';

  return (
    <PageContainer size="lg">
      <PageHeader
        title={accessibility.title[language]}
        subtitle={accessibility.subtitle[language]}
      />

      <div className="space-y-8" dir={dir}>
        {/* Commitment Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          whileHover={{
            y: -3,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)",
          }}
          className="rounded-2xl backdrop-blur-xl p-6 md:p-10"
          style={{
            backgroundColor: "#383e4e",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: "rgba(159, 95, 128, 0.2)",
                border: "1px solid rgba(159, 95, 128, 0.4)",
              }}
            >
              <Eye className="w-6 h-6" style={{ color: "#9F5F80" }} />
            </div>
            <h2 className="text-2xl md:text-3xl m-0 flex-1" style={{ color: "#b6bac5", textAlign }}>
              {accessibility.commitment.title[language]}
            </h2>
          </div>
          <p style={{ color: "#b6bac5", opacity: 0.9, textAlign }} className="text-lg">
            {accessibility.commitment.content[language]}
          </p>
        </motion.div>

        {/* Standards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
          whileHover={{
            y: -3,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)",
          }}
          className="rounded-2xl backdrop-blur-xl p-6 md:p-10"
          style={{
            backgroundColor: "#383e4e",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <h2 className="text-2xl md:text-3xl mb-4" style={{ color: "#b6bac5", textAlign }}>
            {accessibility.standards.title[language]}
          </h2>
          <p style={{ color: "#b6bac5", opacity: 0.9, textAlign }}>
            {accessibility.standards.content[language]}
          </p>
        </motion.div>

        {/* Features Section */}
        <div>
          <h2
            className="text-2xl md:text-3xl mb-6"
            style={{ color: "#383e4e", textShadow: "0 2px 8px rgba(159, 95, 128, 0.15)", textAlign }}
          >
            {accessibility.features.title[language]}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Keyboard}
              title={accessibility.features.items[0][language]}
              color="#60a5fa"
              delay={0.2}
            />
            <FeatureCard
              icon={Monitor}
              title={accessibility.features.items[1][language]}
              color="#34d399"
              delay={0.3}
            />
            <FeatureCard
              icon={Type}
              title={accessibility.features.items[2][language]}
              color="#a78bfa"
              delay={0.4}
            />
            <FeatureCard
              icon={Zap}
              title={accessibility.features.items[3][language]}
              color="#fb923c"
              delay={0.5}
            />
            <FeatureCard
              icon={Eye}
              title={accessibility.features.items[4][language]}
              color="#f472b6"
              delay={0.6}
            />
            <FeatureCard
              icon={ImageIcon}
              title={accessibility.features.items[5][language]}
              color="#34d9c0"
              delay={0.7}
            />
            <FeatureCard
              icon={Code}
              title={accessibility.features.items[6][language]}
              color="#fbbf24"
              delay={0.8}
            />
            <FeatureCard
              icon={Tag}
              title={accessibility.features.items[7][language]}
              color="#ef4444"
              delay={0.9}
            />
          </div>
        </div>

        {/* Feedback Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.2 }}
          whileHover={{
            y: -3,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)",
          }}
          className="rounded-2xl backdrop-blur-xl p-6 md:p-10"
          style={{
            backgroundColor: "#383e4e",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: "rgba(159, 95, 128, 0.2)",
                border: "1px solid rgba(159, 95, 128, 0.4)",
              }}
            >
              <Mail className="w-6 h-6" style={{ color: "#9F5F80" }} />
            </div>
            <h2 className="text-2xl md:text-3xl m-0 flex-1" style={{ color: "#b6bac5", textAlign }}>
              {accessibility.feedback.title[language]}
            </h2>
          </div>
          <p style={{ color: "#b6bac5", opacity: 0.9, textAlign }} className="mb-4">
            {accessibility.feedback.content[language]}
          </p>
          <p style={{ color: "#b6bac5", textAlign }}>
            {accessibility.feedback.email[language]}:{" "}
            <a
              href="mailto:accessibility@applytide.com"
              className="hover:opacity-80 transition-opacity"
              style={{ color: "#9F5F80" }}
            >
              accessibility@applytide.com
            </a>
          </p>
        </motion.div>

        {/* Continuous Improvement Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.3 }}
          whileHover={{
            y: -3,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)",
          }}
          className="rounded-2xl backdrop-blur-xl p-6 md:p-10"
          style={{
            backgroundColor: "#383e4e",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <h2 className="text-2xl md:text-3xl mb-4" style={{ color: "#b6bac5", textAlign }}>
            {accessibility.updates.title[language]}
          </h2>
          <p style={{ color: "#b6bac5", opacity: 0.9, textAlign }}>
            {accessibility.updates.content[language]}
          </p>
        </motion.div>

        {/* Related Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.4 }}
          className="rounded-xl backdrop-blur-xl p-6"
          style={{
            backgroundColor: "rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.2)",
          }}
        >
          <h3 className="text-lg mb-4" style={{ color: "#383e4e", textAlign }}>
            {language === 'en' ? 'Related Resources' : 'משאבים קשורים'}
          </h3>
          <div className={`flex flex-wrap gap-4 ${dir === 'rtl' ? 'justify-end' : ''}`}>
            <Link
              to="/contact"
              className="px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: "rgba(159, 95, 128, 0.2)",
                color: "#9F5F80",
                border: "1px solid rgba(159, 95, 128, 0.3)",
              }}
            >
              {language === 'en' ? 'Contact Us' : 'צור קשר'}
            </Link>
            <Link
              to="/privacy"
              className="px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: "rgba(159, 95, 128, 0.2)",
                color: "#9F5F80",
                border: "1px solid rgba(159, 95, 128, 0.3)",
              }}
            >
              {language === 'en' ? 'Privacy Policy' : 'מדיניות פרטיות'}
            </Link>
            <Link
              to="/terms"
              className="px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: "rgba(159, 95, 128, 0.2)",
                color: "#9F5F80",
                border: "1px solid rgba(159, 95, 128, 0.3)",
              }}
            >
              {language === 'en' ? 'Terms & Conditions' : 'תנאים והגבלות'}
            </Link>
          </div>
        </motion.div>
      </div>
    </PageContainer>
  );
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  color: string;
  delay?: number;
}

function FeatureCard({ icon: Icon, title, color, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
      whileHover={{
        scale: 1.05,
        y: -5,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)",
      }}
      className="rounded-xl backdrop-blur-xl p-6 text-center"
      style={{
        backgroundColor: "#383e4e",
        boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
        border: "1px solid rgba(159, 95, 128, 0.2)",
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
        style={{
          backgroundColor: `${color}33`,
          border: `1px solid ${color}66`,
        }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <p className="text-sm" style={{ color: "#b6bac5" }}>
        {title}
      </p>
    </motion.div>
  );
}
