import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// List of common free email providers that are NOT allowed for business accounts
const FREE_EMAIL_PROVIDERS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.fr',
  'yahoo.co.uk',
  'hotmail.com',
  'hotmail.fr',
  'hotmail.co.uk',
  'outlook.com',
  'outlook.fr',
  'live.com',
  'live.fr',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'gmx.fr',
  'tutanota.com',
  'fastmail.com',
  'hey.com',
  'pm.me',
  'mailfence.com',
  'runbox.com',
  'posteo.de',
  'mailbox.org',
  'disroot.org',
  'riseup.net',
  'cock.li',
  'temp-mail.org',
  'guerrillamail.com',
  'sharklasers.com',
  'mailinator.com',
  'yopmail.com',
  'tempail.com',
  '10minutemail.com',
  'throwaway.email',
  'free.fr',
  'orange.fr',
  'laposte.net',
  'sfr.fr',
  'wanadoo.fr',
  'bbox.fr',
  'skynet.be',
  'telenet.be',
  'proximus.be',
  'web.de',
  't-online.de',
  'libero.it',
  'virgilio.it',
  'alice.it',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'rediffmail.com',
];

@ValidatorConstraint({ async: false })
export class IsBusinessEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const domain = email.toLowerCase().split('@')[1];
    if (!domain) {
      return false;
    }

    // Check if domain is in the free email providers list
    return !FREE_EMAIL_PROVIDERS.includes(domain);
  }

  defaultMessage(): string {
    return 'Please use a business email address. Personal email providers (Gmail, Yahoo, etc.) are not allowed.';
  }
}

export function IsBusinessEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBusinessEmailConstraint,
    });
  };
}
