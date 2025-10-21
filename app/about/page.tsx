
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="card">
        <h1 className="h1 mb-4">About Limited Hangout</h1>
        <p className="leading-7 mb-4">
          We’re a three-person comedy group making sketches and doing stand-up across the DMV and beyond.
          Our stuff blends brains, chaos, and a healthy fear of meeting our heroes.
        </p>
        <p className="leading-7 muted">
          Booking & inquiries: <a href="mailto:booking@limitedhangout.com">booking@limitedhangout.com</a>
        </p>
      </div>

      <div className="card overflow-hidden">
        <Image
          src="/group.jpg"
          alt="Limited Hangout — group photo"
          width={1600}
          height={1000}
          className="w-full h-auto object-cover rounded-xl"
          priority
        />
      </div>
    </div>
  );
}
