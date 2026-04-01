/**
 * PersonalInfoSection Component
 * Edit personal information
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Save, Linkedin, Github, Globe, Twitter, Instagram, Youtube, Link as LinkIcon, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import type { UserProfile } from '../../../features/profile/api';
import { COUNTRY_PHONE_CODES, ALL_COUNTRIES } from '../../../constants/countries';
import { getCountryName } from '../../../constants/countries-hebrew';

interface PersonalInfoSectionProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
  isRTL?: boolean;
}

interface SocialLink {
  platform: string;
  url: string;
}

export function PersonalInfoSection({ profile, onUpdate, isRTL = false }: PersonalInfoSectionProps) {
  const [saving, setSaving] = useState(false);
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
  
  // Parse phone number
  const parsePhone = (phone: string) => {
    if (!phone) return { code: '+1', number: '' };
    
    // Find matching country code (check longer codes first)
    const sortedCodes = [...COUNTRY_PHONE_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const cc of sortedCodes) {
      if (phone.startsWith(cc.code)) {
        return {
          code: cc.code,
          number: phone.substring(cc.code.length).replace(/[^\d]/g, ''),
        };
      }
    }
    
    return { code: '+1', number: phone.replace(/[^\d]/g, '') };
  };

  const phoneData = parsePhone(profile.phone || '');
  
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    phone_country_code: phoneData.code,
    phone_number: phoneData.number,
    location: profile.location || '',
    bio: profile.bio || '',
  });

  // Parse social links from profile
  const parseSocialLinks = (): SocialLink[] => {
    const links: SocialLink[] = [];
    
    if (profile.linkedin_url) {
      links.push({ platform: 'LinkedIn', url: profile.linkedin_url });
    }
    if (profile.github_url) {
      links.push({ platform: 'GitHub', url: profile.github_url });
    }
    if (profile.portfolio_url) {
      links.push({ platform: 'Portfolio', url: profile.portfolio_url });
    }
    if (profile.twitter_url) {
      links.push({ platform: 'Twitter', url: profile.twitter_url });
    }
    if (profile.instagram_url) {
      links.push({ platform: 'Instagram', url: profile.instagram_url });
    }
    if (profile.youtube_url) {
      links.push({ platform: 'YouTube', url: profile.youtube_url });
    }
    
    // Add custom links if available
    if (profile.custom_links) {
      const customLinks = profile.custom_links as Array<{ platform: string; url: string }>;
      links.push(...customLinks.map(l => ({ platform: l.platform || 'Other', url: l.url })));
    }
    
    return links;
  };

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(parseSocialLinks());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Combine phone
      const fullPhone = formData.phone_number 
        ? `${formData.phone_country_code}${formData.phone_number}`
        : '';

      // Parse social links back to individual fields
      const socialData: Record<string, string | Array<{ platform: string; url: string }>> = {
        linkedin_url: '',
        github_url: '',
        portfolio_url: '',
        twitter_url: '',
        instagram_url: '',
        youtube_url: '',
        custom_links: [],
      };

      socialLinks.forEach(link => {
        if (!link.url.trim()) return;
        
        switch (link.platform) {
          case 'LinkedIn':
            socialData.linkedin_url = link.url;
            break;
          case 'GitHub':
            socialData.github_url = link.url;
            break;
          case 'Portfolio':
            socialData.portfolio_url = link.url;
            break;
          case 'Twitter':
            socialData.twitter_url = link.url;
            break;
          case 'Instagram':
            socialData.instagram_url = link.url;
            break;
          case 'YouTube':
            socialData.youtube_url = link.url;
            break;
          default:
            (socialData.custom_links as Array<{ platform: string; url: string }>).push({ platform: link.platform, url: link.url });
        }
      });

      await onUpdate({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: fullPhone,
        location: formData.location,
        bio: formData.bio,
        ...socialData,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
    setSocialLinks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSocialLink = () => {
    setSocialLinks(prev => [...prev, { platform: 'Other', url: '' }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'LinkedIn':
        return <Linkedin className="h-4 w-4 text-blue-600" />;
      case 'GitHub':
        return <Github className="h-4 w-4 text-gray-700 dark:text-gray-300" />;
      case 'Portfolio':
        return <Globe className="h-4 w-4 text-green-600" />;
      case 'Twitter':
        return <Twitter className="h-4 w-4 text-blue-400" />;
      case 'Instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'YouTube':
        return <Youtube className="h-4 w-4 text-red-600" />;
      default:
        return <LinkIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6"
    >
      <form onSubmit={handleSubmit} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Basic Info */}
        <div>
          <h3 className={`text-lg font-bold text-[#383e4e] dark:text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'מידע בסיסי' : 'Basic Information'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'שם פרטי' : 'First Name'}</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder={isRTL ? 'שם פרטי' : 'First Name'}
                className={isRTL ? 'text-right' : ''}
              />
            </div>
            <div>
              <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'שם משפחה' : 'Last Name'}</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder={isRTL ? 'שם משפחה' : 'Last Name'}
                className={isRTL ? 'text-right' : ''}
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className={`text-lg font-bold text-[#383e4e] dark:text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'פרטי התקשרות' : 'Contact Information'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'אימייל' : 'Email'}</Label>
              <Input value={profile.email} disabled className={`bg-gray-100 dark:bg-[#383e4e]/30 ${isRTL ? 'text-right' : ''}`} />
              <p className={`text-xs text-[#6c757d] dark:text-[#b6bac5] mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'לא ניתן לשנות אימייל' : 'Email cannot be changed'}
              </p>
            </div>
            <div>
              <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'טלפון' : 'Phone'}</Label>
              <div className="flex gap-2" dir="ltr">
                <Popover open={phoneCodeOpen} onOpenChange={setPhoneCodeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={phoneCodeOpen}
                      className="w-40 justify-between"
                    >
                      {formData.phone_country_code}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <Command>
                      <CommandInput placeholder={isRTL ? 'חפש מדינה...' : 'Search country...'} />
                      <CommandList>
                        <CommandEmpty>{isRTL ? 'לא נמצאה מדינה' : 'No country found'}</CommandEmpty>
                        <CommandGroup>
                          {COUNTRY_PHONE_CODES.map((cc) => (
                            <CommandItem
                              key={`${cc.code}-${cc.country}`}
                              value={`${cc.name} ${cc.code} ${cc.country}`}
                              onSelect={() => {
                                handleChange('phone_country_code', cc.code);
                                setPhoneCodeOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.phone_country_code === cc.code
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                }`}
                              />
                              {cc.code} - {cc.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  value={formData.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={isRTL ? '50-123-4567' : '555-123-4567'}
                  type="tel"
                  className="flex-1"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <Label>{isRTL ? 'מיקום' : 'Location'}</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => handleChange('location', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'בחר מדינה' : 'Select Country'} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {ALL_COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {getCountryName(country, isRTL)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <h3 className={`text-lg font-bold text-[#383e4e] dark:text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'אודות' : 'About'}
          </h3>
          <div>
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'ביוגרפיה' : 'Bio'}</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder={isRTL
                ? 'ספר לנו קצת על עצמך...'
                : 'Tell us a bit about yourself...'}
              rows={4}
              maxLength={500}
              className={isRTL ? 'text-right' : ''}
            />
            <p className={`text-xs text-[#6c757d] dark:text-[#b6bac5] mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {formData.bio.length}/500
            </p>
          </div>
        </div>

        {/* Social Links */}
        <div>
          <h3 className={`text-lg font-bold text-[#383e4e] dark:text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'קישורים חברתיים' : 'Social Links'}
          </h3>
          <div className="space-y-3">
            {socialLinks.map((link, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Select
                  value={link.platform}
                  onValueChange={(value) => handleSocialLinkChange(index, 'platform', value)}
                >
                  <SelectTrigger className="w-40">
                    <div className="flex items-center gap-2">
                      {getSocialIcon(link.platform)}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LinkedIn">
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </div>
                    </SelectItem>
                    <SelectItem value="GitHub">
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        GitHub
                      </div>
                    </SelectItem>
                    <SelectItem value="Portfolio">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Portfolio
                      </div>
                    </SelectItem>
                    <SelectItem value="Twitter">
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </div>
                    </SelectItem>
                    <SelectItem value="Instagram">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </div>
                    </SelectItem>
                    <SelectItem value="YouTube">
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4" />
                        YouTube
                      </div>
                    </SelectItem>
                    <SelectItem value="Other">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Other
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={link.url}
                  onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                  placeholder={`https://${link.platform.toLowerCase()}.com/username`}
                  type="url"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSocialLink(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSocialLink}
              className="w-full"
            >
              + {isRTL ? 'הוסף קישור' : 'Add Link'}
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-[#b6bac5]/20">
          <Button
            type="submit"
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving
              ? (isRTL ? 'שומר...' : 'Saving...')
              : (isRTL ? 'שמור שינויים' : 'Save Changes')}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

export default PersonalInfoSection;