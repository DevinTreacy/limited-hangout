
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="card">
        <h1 className="h1 mb-4">About Limited Hangout</h1>
        <p className="leading-7 mb-4">
        Limited Hangout is a sketch comedy group made up of Matt Chrzanowski, Patrick Lynott, and Devin Treacy, three stand up comedians based in Washington, D.C.
        We post sketches every week and perform live stand up comedy all over the DMV so come see us perform. If you want to contact us about coming to your city or you wanna tell us we suck, email or message us on social media!
        </p>
        <p className="leading-7 muted">
          Booking & inquiries: <a href="mailto:limited.hangout.tv@gmail.com">limited.hangout.tv@gmail.com</a>
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
