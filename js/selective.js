/**
 * Selective structure content editor.
 */

import { html, render } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat'
import Editor from './selective/editor'
import Field from './selective/field'
import Fields from './selective/fields'
import { autoDeepObject } from './utility/deepObject'

const Selective = Editor

export default Selective
export { Field, Fields,  html, repeat, render, autoDeepObject }
