//* meta programming - not a big impact on end user, useful for other developers
//* to enable decorators, head over to tsconfig and enable
//* "experimentalDecorators": true

//* in the end a decorator is just a function
//* capitalizing the decorator is not a must-do, but it is common practice
//* decorators execute when the class is defined, not when it is instantiated
//function Logger(constructor: Function) {
//* meaning these two logs will print before the ones in the class and below it
//   console.log("Logging...");
//   console.log(constructor);
// }

//? decorator factory
//* thing to know: the factories themselves run from page top to down, the decorators run from bottom up
//* all decorators run when you define the thing they are decorating, ie when JS reads it
//* all decorators on a given class will run even if the class is never instantiated, and they also do run on instantiation
//* they do not run at runtime, they are for running background work "meta programming" when the class is defined
//* returns a decorator but allows us to configure it as we assign it as a decorator to something
//* now it will require an argument instead of just being called like @Logger
//* this adds reusability since now you can pass in a custom message to be logged on whatever class it's decorating
function Logger(logString: string) {
  console.log("LOGGER FACTORY");
  return function (constructor: Function) {
    console.log(logString);
    console.log(constructor);
  };
}

//? for this we added a <div id='app'> to index.html
//* basically this decorator factory accepts a string containing an html element you want displayed, and the id of the element you want it to replace
function WithTemplate(template: string, hookId: string) {
  console.log("TEMPLATE FACTORY");
  return function <T extends { new (...args: any[]): { name: string } }>(originalConstructor: T) {
    //* returning a class, which is syntactic sugar for a constructor function, extending the constructor function of class this is decorating
    //!re-watch Returning (and changing) a Class in a Class Decorator to understand all of this
    //? basically it shows how you can make a decorator that doesn't run until instantiation
    return class extends originalConstructor {
      constructor(..._: any[]) {
        super();
        console.log("Rendering Template");
        const hookEl = document.getElementById(hookId);
        if (hookEl) {
          hookEl.innerHTML = template;
          hookEl.querySelector("h1")!.textContent = this.name;
        }
      }
    };
  };
}

//* to invoke a decorator put it on the line above its target use @ followed by the constructor name, no ()
//* decorator factories need the () and whatever arguments they take
//* the decorator will run even if the class is never instantiated
//* in this example it is running as soon as JS finds the constructor function since that's the argument it takes
@Logger("LOGGING - PERSON")
//WithTemplate finds the <div id='app'>, replaces it with an <h1>My Person Object</h1> and then changes the text content to the person's name
@WithTemplate("<h1>My Person Object</h1>", "app")
class Person {
  name = "Geo";

  constructor() {
    console.log("Creating new person...");
  }
}

const person = new Person();
console.log(person);

//? property decorators
console.log("BEEP BOOP BEEP BEEP BOOP");

function Log(target: any, propertyName: string | Symbol) {
  console.log("Property Decorator!");
  console.log(target, propertyName);
}

function Log2(target: any, name: string, descriptor: PropertyDescriptor) {
  console.log("Accessor Decorator!");
  console.log(target);
  console.log(name);
  console.log(descriptor);
}

function Log3(target: any, name: string | Symbol, descriptor: PropertyDescriptor) {
  console.log("Method Decorator!");
  console.log(target);
  console.log(name);
  console.log(descriptor);
}

function Log4(target: any, name: string | Symbol, position: number) {
  console.log("Parameter Decorator!");
  console.log(target);
  console.log(name);
  console.log(position);
}

class Product {
  //* prints the prototype of a product object as these values are registered with JS
  @Log
  title: string;
  private _price: number;

  @Log2
  set price(val: number) {
    if (val > 0) {
      this._price = val;
    } else {
      throw new Error("Invalid price - must be positive");
    }
  }

  constructor(t: string, p: number) {
    this.title = t;
    this._price = p;
  }

  @Log3
  getPriceWithTax(@Log4 tax: number) {
    return this._price * (1 + tax);
  }
}

//? creating an autobind decorator
//* basically this is an example of making it so that no matter how you call Printer it will be properly bound
function AutoBind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    enumerable: false,
    get() {
      const boundFunction = originalMethod.bind(this);
      return boundFunction;
    },
  };
  return adjDescriptor;
}

class Printer {
  message = "This works!";

  @AutoBind
  showMessage() {
    console.log(this.message);
  }
}

const p = new Printer();

const button = document.querySelector("button")!;
//* the below prints undefined because the 'this' now points to the event listener
// button.addEventListener("click", p.showMessage);
//* binding to p ensures that the 'this' is properly referring to the instance of the printer class
// button.addEventListener("click", p.showMessage.bind(p));

//* this now works without the above workarounds because we made and added the @AutoBind decorator
button.addEventListener("click", p.showMessage);

//? validation with decorators
//* you can probably find a 3rd party library that does all of this (better) so instead of writing it you would just import each decorator and the validate function and use them as needed
interface ValidatorConfig {
  [property: string]: {
    [validatableProp: string]: string[]; //
  };
}

const registeredValidators: ValidatorConfig = {};

function Required(target: any, propName: string) {
  registeredValidators[target.constructor.name] = {
    ...registeredValidators[target.constructor.name],
    [propName]: ["Required"],
  };
}

function PositiveNumber(target: any, propName: string) {
  registeredValidators[target.constructor.name] = {
    ...registeredValidators[target.constructor.name],
    [propName]: ["Positive"],
  };
}

function validate(obj: any) {
  const objValidatorConfig = registeredValidators[obj.constructor.name];
  if (!objValidatorConfig) {
    return true;
  }
  let isValid = true;
  for (const prop in objValidatorConfig) {
    for (const validator of objValidatorConfig[prop]) {
      switch (validator) {
        case "Required":
          isValid = isValid && !!obj[prop];
          break;
        case "Positive":
          isValid = isValid && obj[prop] > 0;
          break;
      }
    }
  }
  return isValid;
}

class Course {
  @Required
  title: string;
  @PositiveNumber
  price: number;

  constructor(t: string, p: number) {
    this.title = t;
    this.price = p;
  }
}

const courseForm = document.querySelector("form")!;
courseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const titleEl = document.getElementById("title") as HTMLInputElement;
  const priceEl = document.getElementById("price") as HTMLInputElement;

  const title = titleEl.value;
  const price = +priceEl.value;

  const createdCourse = new Course(title, price);

  if (!validate(createdCourse)) {
    alert("Invalid input, do better!");
    return;
  }
  console.log(createdCourse);
});

//? In the current form, our validation logic is not entirely correct. It's not working as intended.

//? At the moment, only one validator value is stored in the array (e.g. 'required') - of course that's not what we need. Multiple values should be stored instead - at least potentially.

//? Here's how you can adjust the code to make that work:

// const registeredValidators: ValidatorConfig = {};

// function Required(target: any, propName: string) {
//     registeredValidators[target.constructor.name] = {
//         ...registeredValidators[target.constructor.name],
//         [propName]: [...(registeredValidators[target.constructor.name]?.[propName] ?? []), 'required']
//     };
// }

// function PositiveNumber(target: any, propName: string) {
//     registeredValidators[target.constructor.name] = {
//         ...registeredValidators[target.constructor.name],
//         [propName]: [...(registeredValidators[target.constructor.name]?.[propName] ?? []), 'positive']
//     };
// }
