export function download(name: string, value: string) {
  const url = URL.createObjectURL(
      new Blob([value], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
