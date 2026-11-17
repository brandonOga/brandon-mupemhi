import { FiFileText, FiGithub, FiLinkedin } from "react-icons/fi";

const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/brandon-mupemhi-697007230/", Icon: FiLinkedin },
  { label: "GitHub", href: "https://github.com/brandonOga", Icon: FiGithub },
  { label: "My resume", href: "/cv.pdf", Icon: FiFileText },
];

// Icon links for LinkedIn, GitHub and the resume, used by the homepage's
// "Say Hello" section and the project pages' "Let's talk" band. On hover the
// white icon slides up and out as an orange copy slides in from below, the
// same swap the text links in the header use.
export default function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`social-links ${className}`}>
      {LINKS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="contact-swap-button social-link"
        >
          <span className="contact-button__label" aria-hidden="true">
            <span><Icon /></span>
            <span className="text-primary-color"><Icon /></span>
          </span>
        </a>
      ))}
    </div>
  );
}
