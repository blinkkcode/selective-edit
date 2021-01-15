import {TemplateResult, html} from 'lit-html';
import {Base} from '../mixins';
import {Config} from '../utility/config';
import {ConfigMixin} from '../mixins/config';
import {DataMixin} from '../mixins/data';
import {DeepObject} from '../utility/deepObject';
import {FieldComponent} from './field';
import {SelectiveEditor} from './editor';
import {Template} from './template';
import {Types} from './types';
import {UuidMixin} from '../mixins/uuid';
import extend from 'deep-extend';
import {repeat} from 'lit-html/directives/repeat';

export interface FieldsComponent {
  template: Template;

  /**
   * Fields can define any properties or methods they need.
   */
  [x: string]: any;
}

export type FieldsConstructor = (
  types: Types,
  config: Config
) => FieldsComponent;

/**
 * Fields control the display of a list of fields in the editor.
 */
export class Fields
  extends UuidMixin(DataMixin(ConfigMixin(Base)))
  implements FieldsComponent {
  private currentValue?: DeepObject;
  fields: Array<FieldComponent>;
  private isLocked: boolean;
  private originalValue?: DeepObject;
  types: Types;

  constructor(types: Types, config: Config) {
    super();
    this.types = types;
    this.config = config;

    this.isLocked = false;
    this.fields = [];
  }

  addField(fieldConfig: Config) {
    const newField = this.types.fields.newFromKey(
      fieldConfig.get('type'),
      this.types,
      fieldConfig
    );

    if (!newField) {
      console.error(
        `Unable to add field for unknown field type: ${fieldConfig.get(
          'type'
        )}.`
      );
      return;
    }
    this.fields.push(newField);
  }

  /**
   * When there is no value, guess based on the known information about
   * the fields.
   */
  guessDefaultValue(): string | Record<string, any> {
    // When there are multiple fields, default is an object.
    if (this.fields.length > 1) {
      return {};
    }
    return '';
  }

  /**
   * Checks if the value is clean (unchanged) from the original value.
   */
  get isClean(): boolean {
    for (const field of this.fields) {
      if (!field.isClean) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if the fields are simple and can be simplified in the display.
   */
  get isSimple(): boolean {
    return this.fields.length <= 1;
  }

  /**
   * Checks all the fields to find out if there are invalid fields.
   */
  get isValid() {
    for (const field of this.fields) {
      if (!field.isValid) {
        return false;
      }
    }
    return true;
  }

  /**
   * Certain cases require the field to be locked while updating to prevent bad
   * data mixing. This allows for manually locking the fields.
   */
  lock() {
    this.isLocked = true;

    // Lock all the fields to prevent them from being updated.
    for (const field of this.fields) {
      field.lock();
    }
  }

  /**
   * Template for determining how to render the fields.
   *
   * @param editor Selective editor used to render the template.
   * @param data Data provided to render the template.
   */
  template(editor: SelectiveEditor, data: DeepObject): TemplateResult {
    if (!this.fields.length) {
      return html``;
    }

    if (this.isSimple) {
      return html` ${this.updateOriginal(editor, data)}
      ${this.fields[0].template(editor, data)}`;
    }

    return html`<div class="selective__fields">
      ${this.updateOriginal(editor, data)}
      ${repeat(
        this.fields,
        (field: FieldComponent) => field.uuid,
        (field: FieldComponent) => html` ${field.template(editor, data)} `
      )}
    </div>`;
  }

  /**
   * Certain cases require the field to be locked while updating to prevent bad
   * data mixing. This allows for manually unlocking the fields.
   */
  unlock() {
    this.isLocked = false;

    // Lock all the fields to prevent them from being updated.
    for (const field of this.fields) {
      field.unlock();
    }
  }

  /**
   * The data is not known to the fields until the rendering is done.
   *
   * Updated the original value from the data provided during rendering.
   * This gives a base set of values for clean checks and validation to use.
   *
   * @param editor Selective editor used to render the template.
   * @param data Data provided to render the template.
   * @param deep Update in fields as well, such as when the field is not visible.
   */
  private updateOriginal(
    editor: SelectiveEditor,
    data: DeepObject,
    deep = false
  ): void {
    // Manual locking prevents the original value overwriting the value
    // in special cases when it should not.
    if (this.isLocked) {
      return;
    }

    this.originalValue = data;

    if (deep) {
      // Update all the fields since they may not get rendered.
      // Ex: a collapsed list would not get the update.
      for (const field of this.fields) {
        field.updateOriginal(editor, data);
      }
    }
  }

  /**
   * Returns the value from all of the fields in a single object.
   */
  get value(): any {
    if (!this.fields.length) {
      return null;
    }

    if (this.isSimple && !this.fields[0].key) {
      return this.fields[0].value;
    }

    const value = new DeepObject();
    for (const field of this.fields) {
      value.set(field.key, field.value);
    }

    return extend({}, this?.originalValue?.obj || {}, value.obj);
  }
}
