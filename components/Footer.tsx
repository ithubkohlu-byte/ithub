import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer({
  phone,
  email,
  address,
}: {
  phone: string;
  email: string;
  address: string;
}) {
  return (
    <footer id="contact" className="border-t border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-3 gap-8">
        <div>
          <h3 className="text-gradient font-bold text-xl mb-2">IT HUB</h3>
          <p className="text-white/60 text-sm">
            Empowering students with in-demand IT skills for a brighter future.
          </p>
        </div>
        <div className="space-y-3 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-accent" /> {phone}
          </div>
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-accent" /> {email}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-accent" /> {address}
          </div>
        </div>
        <div className="text-sm text-white/50 sm:text-right">
          © {new Date().getFullYear()} IT HUB Institute. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
