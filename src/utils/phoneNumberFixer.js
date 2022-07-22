import {
  PhoneNumberFormat,
  PhoneNumberUtil,
  PhoneNumberType,
} from "google-libphonenumber";

const phoneUtil = new PhoneNumberUtil();

/**
 * Converte campo de texto contendo número de telefone
 * sem formatação para um formato contendo DDD e número.
 * Valida o campo e retorna se o número de telefone está
 * válido, detectando o DDD e o prefixo do número inserido.
 * @param {String} number Número de telefone.
 * @param {String} countryCode Código do país.
 * @returns Número de telefone no formato DDD+Número 
 */
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
