export function numberToWords(num) {
  if (num === null || num === undefined) return "";
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function numToWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10];
    return a[Math.floor(n / 100)] + "Hundred " + numToWords(n % 100);
  }

  function convert(n) {
    let str = "";
    if (n >= 10000000) {
      str += numToWords(Math.floor(n / 10000000)) + "Crore ";
      n %= 10000000;
    }
    if (n >= 100000) {
      str += numToWords(Math.floor(n / 100000)) + "Lakh ";
      n %= 100000;
    }
    if (n >= 1000) {
      str += numToWords(Math.floor(n / 1000)) + "Thousand ";
      n %= 1000;
    }
    if (n >= 100) {
      str += numToWords(Math.floor(n / 100)) + "Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "and ";
      str += numToWords(n);
    }
    return str;
  }

  const amt = parseFloat(num);
  if (isNaN(amt)) return "";
  if (amt === 0) return "Rupees Zero Only";

  const rupees = Math.floor(amt);
  const paise = Math.round((amt - rupees) * 100);

  let result = "Rupees " + convert(rupees);
  if (paise > 0) {
    result += "and " + numToWords(paise) + "Paise ";
  }
  result += "Only";
  
  // Replace double spaces
  return result.replace(/\s+/g, ' ').trim();
}

export function formatDate(dateString) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (e) {
    return dateString;
  }
}
