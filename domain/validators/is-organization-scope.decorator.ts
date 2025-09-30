import {
  isUUID,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { BILLBOARD_WILDCARD_ORGANIZATION_ID } from '../constants';

export function IsOrganizationScope(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isOrganizationScope',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || value.length === 0) {
            return false;
          }
          if (value === BILLBOARD_WILDCARD_ORGANIZATION_ID) {
            return true;
          }
          return isUUID(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a UUID or "${BILLBOARD_WILDCARD_ORGANIZATION_ID}"`;
        },
      },
    });
  };
}
