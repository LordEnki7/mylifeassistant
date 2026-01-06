import { Button } from "@/components/ui/button";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";
import logoImage from "@assets/My_Life_Assistant_Logo_1767679972274.png";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { VoiceCommandButton } from "@/components/ui/voice-command-button";

export default function MobileHeader() {
  const { toggleMobileMenu } = useNavigation();

  return (
    <header className="navy-gradient text-white shadow-xl lg:hidden">
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 p-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile header menu button clicked');
            toggleMobileMenu();
          }}
        >
          <Icons.menu className="h-6 w-6" />
        </Button>
        <div className="flex items-center space-x-2">
          <img src={logoImage} alt="My Life Assistant" className="h-10 w-10 rounded-lg shadow-md" />
          <h1 className="text-lg font-semibold gold-text">My Life Assistant</h1>
        </div>
        <div className="flex items-center space-x-1">
          <VoiceCommandButton 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10 p-2"
          />
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 p-2"
          >
            <Icons.bell className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
