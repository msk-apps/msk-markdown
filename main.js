MathJax.Hub.Config({
    skipStartupTypeset: true,
    showProcessingMessages: false,
    tex2jax: {
        inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"]
        ],
        displayMath: [
            ["$$", "$$"],
            ["\\[", "\\]"]
        ],
        processEscapes: true
    },
    TeX: {
        equationNumbers: {
            autoNumber: "AMS"
        }
    }
});
marked.setOptions({
    smartLists: true,
    smartypants: true
});

/**
 * @summary basic pluralization support
 * @param {number} amount
 * @param {string} word
 * @returns {string}
 */
const pluralize = (amount, word) => `${amount} ${word}${amount !== 1 ? "s" : ""}`;

const Preview = {
    delay: 0,
    preview: null,
    buffer: null,
    timeout: null,
    mjRunning: false,
    oldText: null,
    Init() {
        this.preview = document.getElementById("viewer");
        this.buffer = document.getElementById("buffer");
        this.textarea = document.getElementById("getm");
        this.wordcount = document.getElementById("wordcount");
        this.charcount = document.getElementById("charcount");
        this.save = document.getElementById("save");
    },
    SwapBuffers() {
        let buffer = this.preview;
        let preview = this.buffer;
        this.buffer = buffer;
        this.preview = preview;
        buffer.style.display = "none";
        preview.style.display = "flex";
    },
    Update() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(this.callback, this.delay);
    },
    CreatePreview() {
        Preview.timeout = null;
        if (this.mjRunning) {
            return;
        }
        let text = this.textarea.value;
        if (text === this.oldtext) {
            return;
        }
        text = this.Escape(text);
        this.buffer.innerHTML = this.oldtext = text;
        this.mjRunning = true;
        MathJax.Hub.Configured();
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.buffer], ["PreviewDone", this], ["resetEquationNumbers", MathJax.InputJax.TeX]);
        const regex = /\s+/gi;

        const hasText = text !== "";
        const wordCount = hasText ? text.trim().replace(regex, " ").split(" ").length : 0;
        const charCount = hasText ? text.replace(regex, "").length : 0;

        this.wordcount.innerHTML = pluralize(wordCount, "Word");
        this.charcount.innerHTML = pluralize(charCount, "Char");

        updateLineNoColNo();
    },
    PreviewDone() {
        this.mjRunning = false;
        text = this.buffer.innerHTML;
        text = this.PartialDescape(text);
        this.buffer.innerHTML = marked(text);
        document.querySelectorAll("code").forEach((block) => {
            hljs.highlightBlock(block);
        });
        this.SwapBuffers();
    },
    Escape(html, encode) {
        return html.replace(!encode ? /&(?!#?\w+;)/g : /&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },
    PartialDescape(html) {
        let lines = html.split("\n");
        let out = "";
        let inside_code = false;
        for (let i = 0; i < lines.length; i += 1) {
            if (lines[i].startsWith("&gt;")) {
                lines[i] = lines[i].replace(/&gt;/g, ">");
            }
            if (inside_code) {
                lines[i] = lines[i].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            }
            if (lines[i].startsWith("```")) {
                inside_code = !inside_code;
            }
            out += `${lines[i]}\n`;
        }
        return out;
    },
    UpdateKeyPress({
        keyCode
    }) {
        if (keyCode < 16 || keyCode > 47) {
            this.preview.innerHTML = `<p>${marked(this.textarea.value)}</p>`;
            this.buffer.innerHTML = `<p>${marked(this.textarea.value)}</p>`;
        }
        this.Update();
    },
    ClearPreview() {
        this.preview.innerHTML = '';
        this.buffer.innerHTML = '';
        this.wordcount.innerHTML = pluralize(0, "Word");
        this.charcount.innerHTML = pluralize(0, "Char");
        updateLineNoColNo();
    }
};
Preview.callback = MathJax.Callback(["CreatePreview", Preview]);
Preview.callback.autoReset = true;
Preview.Init();
Preview.Update();

const mark = document.getElementById("getm");
const updateLineNoColNo = () => {
    const lineno = document.getElementById("lineno");
    const colno = document.getElementById("colno");
    const textLines = mark.value.substr(0, mark.selectionStart).split("\n");
    lineno.innerHTML = `Line ${textLines.length}`;
    colno.innerHTML = `Col ${textLines[textLines.length - 1].length}`;
};
mark.addEventListener("mouseup", updateLineNoColNo);
mark.addEventListener("keyup", ({ key }) => {
    const isArrow = ["ArrowLeft", "ArrowRight"].some((k) => k === key);
    if (!isArrow) return;
    updateLineNoColNo();
});

const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
if (localStorage.getItem("Theme") == "Dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    document.querySelector("meta[name=theme-color]").setAttribute("content", "#282a36");
    toggleSwitch.checked = true;
    localStorage.setItem("Theme", "Dark");
} else {
    document.documentElement.setAttribute("data-theme", "light");
    document.querySelector("meta[name=theme-color]").setAttribute("content", "#DAE5ED");
    toggleSwitch.checked = false;
    localStorage.setItem("Theme", "Light");
}
const switchTheme = ({
    target
}) => {
    if (target.checked) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.querySelector("meta[name=theme-color]").setAttribute("content", "#282a36");
        localStorage.setItem("Theme", "Dark");
    } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.querySelector("meta[name=theme-color]").setAttribute("content", "#DAE5ED");
        localStorage.setItem("Theme", "Light");
    }
};
toggleSwitch.addEventListener("change", switchTheme, false);
const openFile = ({
    target
}) => {
    let input = target;
    let reader = new FileReader();
    reader.onload = () => {
        document.getElementById("getm").value = reader.result;
        input.value = "";
        Preview.Update();
    };
    reader.readAsText(input.files[0]);
};
const handleFileSelect = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const files = evt.dataTransfer.files;
    const reader = new FileReader();
    reader.onload = ({
        target
    }) => {
        document.getElementById("getm").value = target.result;
        Preview.Update();
    };
    reader.readAsText(files[0], "UTF-8");
};
const handleDragOver = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
};
let dropZone = document.getElementById("getm");
dropZone.addEventListener("dragover", handleDragOver, false);
dropZone.addEventListener("drop", handleFileSelect, false);
document.onkeyup = ({
    altKey,
    which
}) => {
    if (altKey && which == 79) {
        document.getElementById("file").click();
    } else if (altKey && which == 83) {
        document.getElementById("save").click();
    }
};
const apply = (e) => {
    let myField = document.getElementById("getm");

    const valueMap = {
        bold: ["**", "**"],
        italic: ["*", "*"],
        strike: ["~", "~"],
        h1: ["# ", ""],
        h2: ["## ", ""],
        h3: ["### ", ""],
        bq: ["> ", ""],
        ol: ["1. ", ""],
        ul: ["- ", ""],
        ic: ["`", "`"],
        bc: ["```\n", "\n```"],
        link: ["[", "]()"],
        check: ["- [x] ", ""],
        image: ["![alt text](image.jpg)", ""],
        hr: ["---\n", ""],
        table: [
            "| Header | Title |\n| ----------- | ----------- |\n| Paragraph | Text |\n",
            "",
        ],
    };

    const [myValueBefore, myValueAfter] = valueMap[e];

    if (document.selection) {
        myField.focus();
        var selectionText = document.selection.createRange().text;
        if (myValueBefore && myValueAfter && selectionText.startsWith(myValueBefore) && selectionText.endsWith(myValueAfter)) {
            selectionText = selectionText.slice(myValueBefore.length, -myValueAfter.length);
        } else {
            // Apply Style
            selectionText = myValueBefore + selectionText + myValueAfter;
        }
    } else if (myField.selectionStart || myField.selectionStart == "0") {
        let startPos = myField.selectionStart;
        let endPos = myField.selectionEnd;
        var selectionText = myField.value.substring(startPos, endPos);
        if (myValueBefore && myValueAfter && selectionText.startsWith(myValueBefore) && selectionText.endsWith(myValueAfter)) {
            myField.value = myField.value.substring(0, startPos) + selectionText.slice(myValueBefore.length, -myValueAfter.length) + myField.value.substring(endPos, myField.value.length);
            myField.selectionStart = startPos;
            myField.selectionEnd = endPos - myValueBefore.length - myValueAfter.length;
            myField.focus();
        } else {
            // Apply Style
            myField.value = myField.value.substring(0, startPos) + myValueBefore + myField.value.substring(startPos, endPos) + myValueAfter + myField.value.substring(endPos, myField.value.length);
            myField.selectionStart = startPos;
            myField.selectionEnd = endPos + myValueBefore.length + myValueAfter.length;
            myField.focus();
        }
    }
    Preview.Update();
};
const slide = (e) => {
    let viewer = document.getElementById("viewer");
    let mark = document.getElementById("getm");

    const styleMap = {
        "nill": {
            viewer: ["100vw", "16px"],
            mark: ["0", "0"]
        },
        "half": {
            viewer: ["50vw", "16px"],
            mark: ["50vw", "16px"]
        },
        "full": {
            viewer: ["0", "0"],
            mark: ["100vw", "16px"]
        }
    };

    const style = styleMap[e];

    viewer.style.width = style.viewer[0];
    viewer.style.padding = style.viewer[1];
    mark.style.width = style.mark[0];
    mark.style.padding = style.mark[1];
};
const About = document.getElementById("About");
const ToggleAbout = document.getElementById("ToggleAbout");
const CloseAbout = document.getElementById("CloseAbout");
const OpenCloseAbout = () => About.classList.toggle("show-modal");
const AboutOnClick = ({
    target
}) => {
    if (target === About) {
        OpenCloseAbout();
    }
};
const SaveFile = document.getElementById("SaveFileModal");
const ToggleSaveFile = document.getElementById("ToggleSaveFile");
const CloseSaveFile = document.getElementById("CloseSaveFile");
const OpenCloseSaveFile = () => SaveFile.classList.toggle("show-modal");
const SaveFileOnClick = ({
    target
}) => {
    if (target === SaveFile) {
        OpenCloseSaveFile();
    }
};
ToggleSaveFile.addEventListener("click", OpenCloseSaveFile);
CloseSaveFile.addEventListener("click", OpenCloseSaveFile);
const Settings = document.getElementById("Settings");
const ToggleSettings = document.getElementById("ToggleSettings");
const CloseSettings = document.getElementById("CloseSettings");
const OpenCloseSettings = () => Settings.classList.toggle("show-modal");
const SettingsOnClick = ({
    target
}) => {
    if (target === Settings) {
        OpenCloseSettings();
    }
};
ToggleAbout.addEventListener("click", OpenCloseAbout);
CloseAbout.addEventListener("click", OpenCloseAbout);
ToggleSettings.addEventListener("click", OpenCloseSettings);
CloseSettings.addEventListener("click", OpenCloseSettings);

function DownloadFile() {
    let DownloadName = document.getElementById("SaveFileInput").value;
    let text = document.getElementById("getm").value;
    text = text.replace(/\n/g, "\r\n");
    let blob = new Blob([text], {
        type: "text/plain"
    });
    let anchor = document.createElement("a");
    anchor.download = DownloadName + ".md";
    anchor.href = window.URL.createObjectURL(blob);
    anchor.target = "_blank";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    OpenCloseSaveFile();
    document.getElementById("DownloadFileForm").reset;
}

/*Clears the TextArea along with the associated markdown*/
const clearTextArea = () => {
    document.getElementById("getm").value = '';
    Preview.ClearPreview();
};

const AddSample = () => {
    document.getElementById("getm").value = `
---
__Advertisement :)__

- __[pica](https://nodeca.github.io/pica/demo/)__ - high quality and fast image
    resize in browser.
- __[babelfish](https://github.com/nodeca/babelfish/)__ - developer friendly
    i18n with plurals support and easy syntax.

You will like those projects!

---

# h1 Heading 8-)
## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading


## Horizontal Rules

___

---

***


## Typographic replacements

Enable typographer option to see result.

(c) (C) (r) (R) (tm) (TM) (p) (P) +-

test.. test... test..... test?..... test!....

!!!!!! ???? ,,  -- ---

"Smartypants, double quotes" and 'single quotes'


## Emphasis

**This is bold text**

__This is bold text__

*This is italic text*

_This is italic text_

~~Strikethrough~~


## Blockquotes


> Blockquotes can also be nested...
>> ...by using additional greater-than signs right next to each other...
> > > ...or with spaces between arrows.


## Lists

Unordered

+ Create a list by starting a line with \`+\`, \`-\`, or \`*\`
+ Sub-lists are made by indenting 2 spaces:
    - Marker character change forces new list start:
    * Ac tristique libero volutpat at
    + Facilisis in pretium nisl aliquet
    - Nulla volutpat aliquam velit
+ Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa


1. You can use sequential numbers...
1. ...or keep all the numbers as \`1.\`

Start numbering with offset:

57. foo
1. bar



## Code

Inline \`code\`

Indented code

    // Some comments
    line 1 of code
    line 2 of code
    line 3 of code


Block code "fences"

\`\`\`
Sample text here...
\`\`\`

Syntax highlighting

\`\`\` js
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
\`\`\`

## Tables

| Option | Description |
| ------ | ----------- |
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |

Right aligned columns

| Option | Description |
| ------:| -----------:|
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |


## Links

[link text](http://dev.nodeca.com)

[link with title](http://nodeca.github.io/pica/demo/ "title text!")

Autoconverted link https://github.com/nodeca/pica (enable linkify to see)


## Images

![Minion](https://octodex.github.com/images/minion.png)
![Stormtroopocat](https://octodex.github.com/images/stormtroopocat.jpg "The Stormtroopocat")

Like links, Images also have a footnote style syntax

![Alt text][id]

With a reference later in the document defining the URL location:

[id]: https://octodex.github.com/images/dojocat.jpg  "The Dojocat"


## Plugins

The killer feature of \`markdown-it\` is very effective support of
[syntax plugins](https://www.npmjs.org/browse/keyword/markdown-it-plugin).


### [Emojies](https://github.com/markdown-it/markdown-it-emoji)

> Classic markup: :wink: :crush: :cry: :tear: :laughing: :yum:
>
> Shortcuts (emoticons): :-) :-( 8-) ;)

see [how to change output](https://github.com/markdown-it/markdown-it-emoji#change-output) with twemoji.


### [Subscript](https://github.com/markdown-it/markdown-it-sub) / [Superscript](https://github.com/markdown-it/markdown-it-sup)

- 19^th^
- H~2~O


### [\<ins>](https://github.com/markdown-it/markdown-it-ins)

++Inserted text++


### [\<mark>](https://github.com/markdown-it/markdown-it-mark)

==Marked text==


### [Footnotes](https://github.com/markdown-it/markdown-it-footnote)

Footnote 1 link[^first].

Footnote 2 link[^second].

Inline footnote^[Text of inline footnote] definition.

Duplicated footnote reference[^second].

[^first]: Footnote **can have markup**

    and multiple paragraphs.

[^second]: Footnote text.


### [Definition lists](https://github.com/markdown-it/markdown-it-deflist)

Term 1

:   Definition 1
with lazy continuation.

Term 2 with *inline markup*

:   Definition 2

        { some code, part of Definition 2 }

    Third paragraph of definition 2.

_Compact style:_

Term 1
  ~ Definition 1

Term 2
  ~ Definition 2a
  ~ Definition 2b


### [Abbreviations](https://github.com/markdown-it/markdown-it-abbr)

This is HTML abbreviation example.

It converts "HTML", but keep intact partial entries like "xxxHTMLyyy" and so on.

*[HTML]: Hyper Text Markup Language

### [Custom containers](https://github.com/markdown-it/markdown-it-container)

::: warning
*here be dragons*
:::
`;
    Preview.Update();
};
 
