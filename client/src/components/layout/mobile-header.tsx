import { Button } from "@/components/ui/button";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";
import logoImage from "@assets/My Life Assistant_1755255862503.png";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { VoiceCommandButton } from "@/components/ui/voice-command-button";

export default function MobileHeader() {
  const { toggleMobileMenu } = useNavigation();

  return (
    <header className="bg-primary-500 text-white shadow-lg lg:hidden">
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-primary-600 p-2"
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
          <img src={logoImage} alt="My Life Assistant" className="h-8 w-8" />
          <h1 className="text-lg font-semibold">My Life Assistant</h1>
        </div>
        <div className="flex items-center space-x-2">
          <VoiceCommandButton 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-primary-600 p-2"
          />
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-primary-600 p-2"
          >
            <Icons.bell className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
