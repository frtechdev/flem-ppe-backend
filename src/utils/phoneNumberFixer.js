import {
  PhoneNumberFormat,
  PhoneNumberUtil,
  PhoneNumberType,
} from "google-libphonenumber";

const phoneUtil = new PhoneNumberUtil();

export const phoneNumberFixer = (number, countryCode) => {
  if (number === null) {
    return {
      formatted: null,
      isValid: null,
      success: false,
      code: countryCode,
    };
  }
  try {
    const phoneNumber = phoneUtil.parse(
      number.split("+").join(""),
      countryCode
    );
    const fixedOrMobileFormatter = (number) => {
      const rawNumber = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
      switch (phoneUtil.getNumberType(number) && rawNumber.length) {
        case PhoneNumberType.FIXED_LINE:
        case PhoneNumberType.MOBILE && 14:
          return rawNumber.slice(3);
        case PhoneNumberType.MOBILE && 13:
          return rawNumber.slice(3, 5) + 9 + rawNumber.slice(5, 14);
        default:
          return rawNumber.slice(3)
      }
      // if (phoneUtil.getNumberType(number) === PhoneNumberType.FIXED_LINE) {
      //   return rawNumber;
      // }
      // if (
      //   phoneUtil.getNumberType(number) === PhoneNumberType.MOBILE &&
      //   rawNumber.length === 16
      // ) {
      //   return rawNumber.slice(0, 7) + 9 + rawNumber.slice(7, 16);
      // }
      // if (
      //   phoneUtil.getNumberType(number) === PhoneNumberType.MOBILE &&
      //   rawNumber.length === 17
      // ) {
      //   return rawNumber;
      // }
    };
    const output = {
      formatted: fixedOrMobileFormatter(phoneNumber),
      isValid: phoneUtil.isValidNumber(phoneNumber),
      success: true,
      code: countryCode,
    };
    return output;
  } catch (e) {
    console.error(e);
    return { formatted: "", isValid: "", success: false, code: "" };
  }
};
