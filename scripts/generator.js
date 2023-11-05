import fs from "fs-extra";
import path from "path";
import * as url from "url";
import * as prettier from "prettier";
import { loadConfig, optimize } from "svgo";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const config = await loadConfig();
const options = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          convertPathData: false,
          removeViewBox: false,
        },
      },
    },
    "removeTitle",
    "removeUselessStrokeAndFill",
    {
      name: "removeAttrs",
      params: {
        attrs: "fill",
      },
    },
  ],
};

function writeToFile(filepath, data) {
  let buffer = Buffer.from(data);
  fs.writeFile(filepath, buffer);
}

function template(iconName, iconContent) {
  let importName = iconName.replace("A4u", "");
  let iconRename = importName;
  if (/^[0-9]/.test(importName)) {
    iconRename = "_" + importName;
  }
  return `import Icon from '../Icon/Icon';
  import type { IconPropsWithoutChildren } from '../Icon/Icon';

  const ${iconName} = (props: IconPropsWithoutChildren) => {
    return (
      <Icon {...props}>
        ${iconContent}
      </Icon>
    );
  };

  export default ${iconName};
`;
}

function convertAttrs(contents) {
  return contents
    .replace(/fill-rule/g, "fillRule")
    .replace(/clip-rule/g, "clipRule")
    .replace(/stroke-width/g, "strokeWidth");
}

export async function generateIcons(iconDir, outputDir) {
  fs.ensureDirSync(outputDir);
  fs.readdir(iconDir, (err, items) => {
    let ignoreList = ["index.js", "util.js"];
    // get all icon files
    let iconFiles = items
      .filter((item) => !!item.endsWith(".svg"))
      .filter((item) => !ignoreList.includes(item));
    console.log(iconFiles);

    // generate all icon files
    iconFiles.forEach(async (icon) => {
      fs.readFile(
        path.resolve(iconDir, icon),
        "utf8",
        async (err, iconContent) => {
          let iconName = icon.replace(".svg", "").replace("-", "");
          iconName = iconName.charAt(0).toUpperCase() + iconName.slice(1);

          let iconFileName = `${
            iconName.charAt(0).toUpperCase() + iconName.slice(1)
          }Icon`;

          let contents = optimize(iconContent, options).data;
          contents = template(iconName, contents);
          contents = convertAttrs(contents);
          contents = await prettier.format(contents, {
            trailingComma: "all",
            singleQuote: true,
            parser: "typescript",
          });
          let filepath = `${outputDir}/${iconFileName}.tsx`;
          writeToFile(filepath, contents);
        }
      );
    });

    // generate index barrel
    // let indexFile = iconFiles
    //   .map((icon) => {
    //     let iconName = icon.substring(0, icon.length - 3);
    //     return `export * as ${
    //       isNaN(Number(iconName[0])) ? iconName : `_${iconName}`
    //     } from './${iconName}';\n`;
    //   })
    //   .join("");

    // let indexFilepath = `${outputDir}/index.ts`;
    // writeToFile(indexFilepath, indexFile);
  });
}

generateIcons(
  path.join(__dirname, "..", "icons"),
  path.join(__dirname, "Icons")
);
