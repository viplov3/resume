const textToType = "Results-oriented Software Engineer with 5+ years of experience\nbuilding high-performance web applications and APIs.\nProven ability to collaborate effectively, troubleshoot complex issues,\nand deliver successful projects.";

const typewriterElement = document.getElementById('typewriter-text');
let index = 0;

function typeWriter() {
  if (index < textToType.length) {
    if (textToType.charAt(index) === '\n') {
      typewriterElement.innerHTML += "<br>";
    } else {
      typewriterElement.innerHTML += textToType.charAt(index);
    }
    index++;
    setTimeout(typeWriter, 50);
  }
}

window.onload = typeWriter;
