export const maskCapitalize = (string) => {
  const exceptions = [
    "do",
    "da",
    "de",
    "dos",
    "das",
    "em",
    "na",
    "no",
    "nas",
    "nos",
    "e",
    "a",
    "o",
  ];
  if ((string) && (string.match("[a-zA-Z]")) ){
    const strInput = string.toLowerCase().split(" ");
    const strCheckExceptions = strInput.map((str) => {
      for (let i = 0; i < exceptions.length; i++) {
        if (str === exceptions[i]) {
          return str;
        }
      }
      return str.toString().charAt(0).toUpperCase() + str.substring(1);
    });
    const strOutput = strCheckExceptions.join(" ");
    return strOutput;
  } else {
    return "";
  }
};
