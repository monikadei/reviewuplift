import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChevronDown } from "lucide-react";

const FaqSection = () => {
  const faqs = [
    {
      question: "How does Review Rhino help monitor my reviews?",
      answer:
        "Review Rhino provides a centralized dashboard where you can track all your customer reviews from multiple platforms in one place. Get real-time notifications when new reviews are posted.",
    },
    {
      question: "Which review platforms can I monitor?",
      answer:
        "Our dashboard supports all major review platforms including Google, Facebook, Yelp, TripAdvisor, and many industry-specific sites. You can connect all your business profiles for comprehensive monitoring.",
    },
    {
      question: "Can I respond to reviews from the dashboard?",
      answer:
        "Yes, you can view and respond to all your reviews directly from our platform. We provide tools to help you manage your responses efficiently.",
    },
    {
      question: "How do I display reviews on my website?",
      answer:
        "Review Rhino offers simple widgets that you can easily embed on your website to showcase your best reviews. Customize which reviews to display based on rating or platform.",
    },
    {
      question: "Do you offer analytics for my reviews?",
      answer:
        "Yes, our dashboard provides analytics to track your review trends over time, including average ratings, response rates, and platform comparisons.",
    },
    {
      question: "How long does it take to set up?",
      answer:
        "Setup is quick and simple. Just connect your business profiles and you'll start seeing your reviews in the dashboard immediately.",
    },
    {
      question: "Can I use this for multiple business locations?",
      answer:
        "Yes, Review Rhino supports multi-location businesses. You can monitor all locations from a single dashboard with location-specific analytics.",
    },
    {
      question: "Is there a mobile app available?",
      answer:
        "Yes, we offer mobile apps for iOS and Android so you can monitor and respond to reviews on the go with real-time notifications.",
    },
  ];

  return (
    <section id="faq" className="py-20 bg-white font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Left Column */}
          <div className="text-left">
            <p className="text-sm text-orange-600 font-semibold uppercase tracking-wider">FAQ</p>
            <h2 className="mt-2 text-4xl font-extrabold text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-md">
              Get answers to the most common questions about Review Rhino.
            </p>
          </div>

          {/* Right Column - Accordion */}
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-gray-200 rounded-lg shadow-sm"
                >
                  <AccordionTrigger className="flex justify-between items-center px-5 py-4 text-left w-full text-lg font-medium text-gray-800 hover:text-orange-600 transition-colors duration-300 no-underline [&>svg]:hidden">
                    <span>{faq.question}</span>
                    <ChevronDown className="ml-2 h-5 w-5 text-gray-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-4 text-gray-600 text-base transition-all duration-500 ease-in-out animate-fade-slide">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Still have questions? Contact our support team for assistance.
          </p>
          <div className="mt-4">
            <button className="text-orange-600 font-medium hover:text-orange-700 flex items-center justify-center mx-auto transition duration-300">
              Contact Support
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .animate-fade-slide {
          animation: fadeSlide 0.4s ease-in-out;
        }

        @keyframes fadeSlide {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
};

export default FaqSection;